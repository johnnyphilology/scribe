#!/usr/bin/env node

/**
 * Auto Release Script for Scribe Extension
 * 
 * This script automates the process of:
 * 1. Creating a pull request from current branch to main
 * 2. Waiting for CI checks (tests + SonarQube) to pass
 * 3. Auto-merging the PR if all checks pass
 * 4. Creating a new release with tag matching package.json version
 * 
 * Prerequisites:
 * - GitHub CLI (gh) installed and authenticated
 * - Current branch has commits to merge
 * - package.json version has been updated
 * 
 * Usage: npm run auto-release
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const REPO_OWNER = 'johnnyphilology';
const REPO_NAME = 'scribe';
const BASE_BRANCH = 'main';
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_WAIT_TIME = 1800000; // 30 minutes
const DEBUG = process.env.DEBUG === '1' || process.argv.includes('--debug');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function debugLog(message, color = 'cyan') {
    if (DEBUG) {
        console.log(`${colors[color]}[DEBUG] ${message}${colors.reset}`);
    }
}

function execCommand(command, options = {}) {
    try {
        debugLog(`Executing: ${command}`);
        const result = execSync(command, { 
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        if (options.silent && result) {
            debugLog(`Command output: ${result.trim()}`);
        }
        return result?.trim();
    } catch (error) {
        if (!options.allowFailure) {
            log(`Error executing command: ${command}`, 'red');
            log(`Command failed: ${command}`, 'red');
            throw error;
        }
        debugLog(`Command failed (allowed): ${command}`);
        debugLog(`Error: ${error.message}`);
        return null;
    }
}

function execCommandSafely(command, options = {}) {
    // For commands that might output help instead of expected results,
    // add extra validation
    const result = execCommand(command, options);
    
    // If result looks like help output (contains common help keywords),
    // treat it as a failure
    if (result && typeof result === 'string') {
        const helpKeywords = ['Usage:', 'USAGE:', 'Commands:', 'Options:', 'FLAGS:', 'ARGUMENTS:'];
        const looksLikeHelp = helpKeywords.some(keyword => result.includes(keyword));
        
        if (looksLikeHelp) {
            debugLog(`Command output looks like help text: ${command}`);
            if (!options.allowFailure) {
                throw new Error(`Command returned help text instead of expected output: ${command}`);
            }
            return null;
        }
    }
    
    return result;
}

function getPackageVersion() {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
}

function getCurrentBranch() {
    return execCommand('git branch --show-current', { silent: true });
}

function getLatestCommitMessage() {
    return execCommand('git log -1 --pretty=%B', { silent: true });
}

function hasUncommittedChanges() {
    const status = execCommand('git status --porcelain', { silent: true });
    return status.length > 0;
}

function escapeShellString(str) {
    // Escape special characters for shell commands
    return str
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/`/g, '\\`')    // Escape backticks
        .replace(/\$/g, '\\$')   // Escape dollar signs
        .replace(/\n/g, '\\n')   // Escape newlines
        .replace(/\r/g, '\\r');  // Escape carriage returns
}

function generateReleaseNotes() {
    const version = getPackageVersion();
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
        return `Release v${version}`;
    }
    
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const lines = changelog.split('\n');
    
    // Find the current version section
    let inCurrentVersion = false;
    let releaseNotes = [];
    
    for (const line of lines) {
        if (line.includes(`[Unreleased]`) || line.includes(`[${version}]`)) {
            inCurrentVersion = true;
            continue;
        }
        
        if (inCurrentVersion && line.startsWith('## [') && !line.includes(version)) {
            break; // Reached next version section
        }
        
        if (inCurrentVersion && line.trim()) {
            releaseNotes.push(line);
        }
    }
    
    if (releaseNotes.length === 0) {
        return `Release v${version}\n\nSee CHANGELOG.md for details.`;
    }
    
    return `Release v${version}\n\n${releaseNotes.join('\n')}`;
}

async function waitForChecks(prNumber) {
    log(`Waiting for CI checks to complete for PR #${prNumber}...`, 'yellow');
    
    // Add initial debug info
    debugLog(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
    debugLog(`PR Number: ${prNumber}`);
    
    // Get GitHub CLI version more robustly
    const ghVersion = execCommandSafely('gh version', { silent: true, allowFailure: true });
    debugLog(`GitHub CLI version: ${ghVersion || 'unknown'}`);
    
    const startTime = Date.now();
    let retryCount = 0;
    
    while (Date.now() - startTime < MAX_WAIT_TIME) {
        retryCount++;
        debugLog(`Check attempt #${retryCount}`);
        
        // First check if PR exists and is mergeable
        const prStatus = execCommand(
            `gh pr view ${prNumber} --json state,mergeable,statusCheckRollup --repo ${REPO_OWNER}/${REPO_NAME}`,
            { silent: true, allowFailure: true }
        );
        
        if (!prStatus) {
            log(`Failed to get PR status for #${prNumber}, retrying...`, 'yellow');
            await sleep(CHECK_INTERVAL);
            continue;
        }
        
        let prData;
        try {
            prData = JSON.parse(prStatus);
            debugLog(`PR State: ${prData.state}, Mergeable: ${prData.mergeable}`);
        } catch (parseError) {
            log(`Failed to parse PR status: ${parseError.message}, retrying...`, 'yellow');
            await sleep(CHECK_INTERVAL);
            continue;
        }
        
        // Check if PR is closed or merged
        if (prData.state === 'MERGED') {
            log('PR is already merged!', 'green');
            return true;
        }
        
        if (prData.state === 'CLOSED') {
            log('PR is closed. Cannot proceed.', 'red');
            return false;
        }
        
        // Get status checks using the newer API
        let checksResult = execCommand(
            `gh pr checks ${prNumber} --json bucket,state,name --repo ${REPO_OWNER}/${REPO_NAME}`,
            { silent: true, allowFailure: true }
        );
        
        // If checks command fails, try alternative approaches
        if (!checksResult) {
            debugLog('gh pr checks failed, trying alternative API...');
            
            // Try using the status API directly
            checksResult = execCommand(
                `gh api repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/status-checks --jq '.statuses[]'`,
                { silent: true, allowFailure: true }
            );
            
            if (!checksResult) {
                debugLog('Both check APIs failed, falling back to mergeable status');
                
                // Fallback: check if PR is mergeable without specific checks
                if (prData.mergeable === 'MERGEABLE') {
                    log('No specific checks found, but PR is mergeable. Proceeding...', 'yellow');
                    return true;
                } else if (prData.mergeable === 'CONFLICTING') {
                    log('PR has merge conflicts. Please resolve them.', 'red');
                    return false;
                } else {
                    log(`PR mergeable status: ${prData.mergeable}. Retrying check status...`, 'yellow');
                    await sleep(CHECK_INTERVAL);
                    continue;
                }
            }
        }
        
        let checks;
        try {
            checks = JSON.parse(checksResult);
            debugLog(`Found ${checks.length} checks`);
        } catch (parseError) {
            log(`Failed to parse check results: ${parseError.message}, retrying...`, 'yellow');
            await sleep(CHECK_INTERVAL);
            continue;
        }
        
        // If no checks are configured, but PR is mergeable, proceed
        if (checks.length === 0) {
            if (prData.mergeable === 'MERGEABLE') {
                log('No CI checks configured, but PR is mergeable. Proceeding...', 'green');
                return true;
            } else {
                log('No CI checks found and PR not mergeable. Waiting...', 'yellow');
                await sleep(CHECK_INTERVAL);
                continue;
            }
        }
        
        const pendingChecks = checks.filter(check => 
            check.bucket === 'pending'
        );
        const failedChecks = checks.filter(check => 
            check.bucket === 'fail' || check.bucket === 'cancel'
        );
        const succeededChecks = checks.filter(check => 
            check.bucket === 'pass'
        );
        const skippedChecks = checks.filter(check => 
            check.bucket === 'skipping'
        );
        
        log(`Checks status: ${succeededChecks.length} passed, ${pendingChecks.length} pending, ${failedChecks.length} failed, ${skippedChecks.length} skipped`, 'cyan');
        
        if (failedChecks.length > 0) {
            log('Some checks failed:', 'red');
            failedChecks.forEach(check => log(`  ❌ ${check.name}: ${check.bucket}`, 'red'));
            return false;
        }
        
        if (pendingChecks.length === 0) {
            log('All checks completed!', 'green');
            if (succeededChecks.length > 0 || skippedChecks.length > 0) {
                return true;
            } else {
                log('No successful checks found. This might indicate a configuration issue.', 'yellow');
                // Check if PR is still mergeable despite no successful checks
                if (prData.mergeable === 'MERGEABLE') {
                    log('PR is still mergeable, proceeding...', 'green');
                    return true;
                }
            }
        }
        
        log(`Waiting for ${pendingChecks.length} pending checks...`, 'yellow');
        pendingChecks.forEach(check => log(`  ⏳ ${check.name}: ${check.bucket}`, 'yellow'));
        
        await sleep(CHECK_INTERVAL);
    }
    
    log('Timeout waiting for checks to complete', 'red');
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createRelease(version) {
    // Switch back to main and pull latest
    log('Switching to main branch and pulling latest changes...', 'yellow');
    execCommand(`git checkout ${BASE_BRANCH}`);
    execCommand('git pull origin main');
    
    // Create release
    log('Creating GitHub release...', 'yellow');
    const tagName = `v${version}`;
    const releaseNotes = generateReleaseNotes();
    
    // Check if tag already exists
    const existingTag = execCommand(`git tag -l ${tagName}`, { silent: true, allowFailure: true });
    if (existingTag) {
        log(`Tag ${tagName} already exists. Skipping release creation.`, 'yellow');
    } else {
        // Use a temporary file for release notes to avoid shell escaping issues
        const tempNotesFile = path.join(__dirname, '..', 'tmp', 'release-notes.txt');
        
        try {
            // Ensure tmp directory exists
            const tmpDir = path.dirname(tempNotesFile);
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // Write release notes to temp file
            fs.writeFileSync(tempNotesFile, releaseNotes, 'utf8');
            
            // Create release using the temp file
            execCommand(`gh release create ${tagName} --title "Release ${tagName}" --notes-file "${tempNotesFile}" --repo ${REPO_OWNER}/${REPO_NAME}`);
            
            // Clean up temp file
            fs.unlinkSync(tempNotesFile);
            
            log(`✅ Release ${tagName} created successfully`, 'green');
        } catch (error) {
            // Fallback to escaped string method
            debugLog(`File-based release creation failed: ${error.message}`);
            log('File-based release creation failed, trying escaped string method...', 'yellow');
            const escapedReleaseNotes = escapeShellString(releaseNotes);
            execCommand(`gh release create ${tagName} --title "Release ${tagName}" --notes "${escapedReleaseNotes}" --repo ${REPO_OWNER}/${REPO_NAME}`);
            log(`✅ Release ${tagName} created successfully`, 'green');
        }
    }
    
    log('🎉 Auto-release process completed successfully!', 'green');
    log(`🔗 View release: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${tagName}`, 'cyan');
}


function extractPRNumber(prResult, currentBranch) {
    // Try multiple regex patterns to extract PR number
    let prNumber = prResult.match(/#(\d+)/)?.[1];
    if (!prNumber) {
        // Try alternative patterns
        prNumber = prResult.match(/pull\/(\d+)/)?.[1];
    }
    if (!prNumber) {
        // Try to extract from URL pattern
        prNumber = prResult.match(/\/(\d+)$/)?.[1];
    }
    
    if (!prNumber) {
        log('Failed to extract PR number from result:', 'red');
        log(prResult, 'red');
        log('Trying to find PR by branch name...', 'yellow');
        
        // Fallback: try to find the PR by branch name
        const prList = execCommand(
            `gh pr list --head ${currentBranch} --base ${BASE_BRANCH} --json number --repo ${REPO_OWNER}/${REPO_NAME}`,
            { silent: true, allowFailure: true }
        );
        
        if (prList) {
            try {
                const prs = JSON.parse(prList);
                if (prs.length > 0) {
                    prNumber = prs[0].number.toString();
                    log(`Found PR by branch lookup: #${prNumber}`, 'cyan');
                }
            } catch (parseError) {
                log(`Failed to parse PR list: ${parseError.message}`, 'red');
            }
        }
    }
    
    return prNumber;
}

function findExistingPR(currentBranch) {
    const existingPR = execCommand(
        `gh pr list --head ${currentBranch} --base ${BASE_BRANCH} --json number,url,title --repo ${REPO_OWNER}/${REPO_NAME}`,
        { silent: true, allowFailure: true }
    );
    
    if (existingPR) {
        try {
            const prs = JSON.parse(existingPR);
            if (prs.length > 0) {
                const pr = prs[0];
                log(`Found existing PR #${pr.number}: "${pr.title}"`, 'cyan');
                log(`🔗 URL: ${pr.url}`, 'cyan');
                return pr.number;
            }
        } catch (parseError) {
            log(`Failed to parse existing PR data: ${parseError.message}`, 'yellow');
        }
    }
    return null;
}

async function getOrCreatePR(currentBranch, version, commitMessage) {
    // First, check if PR already exists for this branch
    log('Checking for existing PR...', 'cyan');
    let prNumber = findExistingPR(currentBranch);
    
    if (prNumber) {
        log(`✅ Using existing pull request: #${prNumber}`, 'green');
        return prNumber;
    }

    // No existing PR found, create a new one
    log('No existing PR found. Creating new PR...', 'yellow');
    const prTitle = `Release v${version}`;
    const prBody = `Automated release PR for version ${version}

**Changes:**
${commitMessage}

**Version:** ${version}

This PR will be automatically merged once all CI checks pass.`;
    
    const escapedPrTitle = escapeShellString(prTitle);
    const escapedPrBody = escapeShellString(prBody);
    
    const prResult = execCommand(
        `gh pr create --title "${escapedPrTitle}" --body "${escapedPrBody}" --base ${BASE_BRANCH} --head ${currentBranch} --repo ${REPO_OWNER}/${REPO_NAME}`,
        { silent: true, allowFailure: true }
    );
    
    if (!prResult) {
        log('PR creation failed. Checking again for existing PR...', 'yellow');
        prNumber = findExistingPR(currentBranch);
        
        if (!prNumber) {
            log('Failed to create new PR and no existing PR found.', 'red');
            log('Please check your GitHub CLI authentication and try again.', 'yellow');
            process.exit(1);
        }
        
        log(`✅ Using existing pull request: #${prNumber}`, 'green');
        return prNumber;
    }

    log(`PR creation result: ${prResult}`, 'cyan');
    debugLog(`Full PR creation output: ${prResult}`);
    
    prNumber = extractPRNumber(prResult, currentBranch);
    
    if (!prNumber) {
        log('Could not determine PR number from creation result. Checking for existing PR...', 'yellow');
        prNumber = findExistingPR(currentBranch);
        
        if (!prNumber) {
            log('Could not determine PR number from creation result. Here is the full output:', 'red');
            console.log(prResult);
            log('Please create the PR manually or check GitHub CLI authentication.', 'yellow');
            process.exit(1);
        }
        
        log(`Found PR via fallback search: #${prNumber}`, 'green');
        return prNumber;
    }
    
    log(`✅ New pull request created: #${prNumber}`, 'green');
    return prNumber;
}

function attemptConflictResolution(currentBranch) {
    log('Attempting to resolve conflicts by updating branch...', 'yellow');
    
    try {
        // Fetch latest changes
        execCommand('git fetch origin');
        
        // Try to rebase on main
        log('Attempting rebase on main...', 'cyan');
        const rebaseResult = execCommand(`git rebase origin/${BASE_BRANCH}`, { allowFailure: true });
        
        if (rebaseResult === null) {
            log('Rebase failed. Trying merge instead...', 'yellow');
            
            // If rebase fails, try merge
            const mergeResult = execCommand(`git merge origin/${BASE_BRANCH}`, { allowFailure: true });
            
            if (mergeResult === null) {
                log('Both rebase and merge failed. Manual intervention required.', 'red');
                return false;
            }
        }
        
        // Push updated branch
        log('Pushing updated branch...', 'cyan');
        execCommand(`git push origin ${currentBranch} --force-with-lease`);
        
        log('✅ Branch updated successfully', 'green');
        return true;
        
    } catch (error) {
        debugLog(`Conflict resolution failed: ${error.message}`);
        return false;
    }
}

async function main() {
    log('🚀 Starting auto-release process...', 'blue');
    
    // Verify prerequisites
    log('Checking prerequisites...', 'cyan');
    
    // Check if gh CLI is installed
    const ghVersion = execCommandSafely('gh version', { silent: true, allowFailure: true });
    if (!ghVersion) {
        log('GitHub CLI (gh) is not installed. Please install it first.', 'red');
        process.exit(1);
    }
    
    // Check if authenticated
    const authStatus = execCommand('gh auth status', { silent: true, allowFailure: true });
    if (!authStatus) {
        log('GitHub CLI is not authenticated. Please run: gh auth login', 'red');
        process.exit(1);
    }
    
    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
        log('You have uncommitted changes. Please commit or stash them first.', 'red');
        process.exit(1);
    }
    
    const currentBranch = getCurrentBranch();
    const version = getPackageVersion();
    const commitMessage = getLatestCommitMessage();
    
    log(`Current branch: ${currentBranch}`, 'cyan');
    log(`Package version: ${version}`, 'cyan');
    log(`Latest commit: ${commitMessage}`, 'cyan');
    
    if (currentBranch === BASE_BRANCH) {
        log('You are on the main branch. Please create a feature branch first.', 'red');
        process.exit(1);
    }
    
    // Push current branch
    log('Pushing current branch to origin...', 'yellow');
    execCommand(`git push origin ${currentBranch}`);
    
    // Get or create pull request
    log('Getting or creating pull request...', 'yellow');
    const prNumber = await getOrCreatePR(currentBranch, version, commitMessage);
    
    // Wait for checks to pass
    const checksPass = await waitForChecks(prNumber);
    
    if (!checksPass) {
        log('CI checks failed or timed out. PR will not be merged automatically.', 'red');
        log(`Please review the PR manually: https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`, 'yellow');
        process.exit(1);
    }
    
    // Check if PR is mergeable before attempting merge
    log('Checking if PR is mergeable...', 'yellow');
    const prStatus = execCommand(
        `gh pr view ${prNumber} --json mergeable,mergeStateStatus --repo ${REPO_OWNER}/${REPO_NAME}`,
        { silent: true, allowFailure: true }
    );
    
    if (prStatus) {
        try {
            const prData = JSON.parse(prStatus);
            debugLog(`PR mergeable: ${prData.mergeable}, merge state: ${prData.mergeStateStatus}`);
            
            if (prData.mergeable === 'CONFLICTING' || prData.mergeStateStatus === 'DIRTY') {
                log('❌ Pull request has merge conflicts.', 'red');
                
                // Ask if user wants to attempt automatic resolution
                log('Attempting to resolve conflicts automatically...', 'yellow');
                
                if (attemptConflictResolution(currentBranch)) {
                    log('✅ Conflicts may have been resolved. Waiting a moment for GitHub to update...', 'green');
                    
                    // Wait a bit for GitHub to process the updated branch
                    await sleep(10000);
                    
                    // Re-check PR status
                    const updatedStatus = execCommand(
                        `gh pr view ${prNumber} --json mergeable,mergeStateStatus --repo ${REPO_OWNER}/${REPO_NAME}`,
                        { silent: true, allowFailure: true }
                    );
                    
                    if (updatedStatus) {
                        try {
                            const updatedData = JSON.parse(updatedStatus);
                            if (updatedData.mergeable === 'MERGEABLE') {
                                log('✅ Conflicts resolved! Proceeding with merge...', 'green');
                            } else {
                                log('❌ Conflicts still exist after automatic resolution attempt.', 'red');
                                log(`Please resolve conflicts manually: https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`, 'yellow');
                                process.exit(1);
                            }
                        } catch (parseError) {
                            debugLog(`Failed to parse updated PR status: ${parseError.message}`);
                            log('Could not verify conflict resolution. Proceeding with merge attempt...', 'yellow');
                        }
                    }
                } else {
                    log('❌ Automatic conflict resolution failed.', 'red');
                    log(`Please resolve conflicts manually: https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`, 'yellow');
                    log('After resolving conflicts, you can run the auto-release script again.', 'cyan');
                    process.exit(1);
                }
            }
        } catch (parseError) {
            debugLog(`Failed to parse PR status: ${parseError.message}`);
            log(`Warning: Could not parse PR status, proceeding with merge attempt...`, 'yellow');
        }
    }
    
    // Attempt to merge the PR
    log('Merging pull request...', 'yellow');
    let mergeSuccessful = false;
    
    try {
        const mergeResult = execCommand(
            `gh pr merge ${prNumber} --squash --delete-branch --repo ${REPO_OWNER}/${REPO_NAME}`,
            { silent: true }
        );
        mergeSuccessful = true;
        debugLog(`Merge command succeeded. Output: ${mergeResult || '(no output)'}`);
        log('Merge command completed successfully!', 'green');
    } catch (error) {
        debugLog(`Merge command failed: ${error.message}`);
        
        // Check if the PR was actually merged by checking its status
        log('Merge command failed, checking if PR was actually merged...', 'yellow');
        const prStatus = execCommand(
            `gh pr view ${prNumber} --json state --repo ${REPO_OWNER}/${REPO_NAME}`,
            { silent: true, allowFailure: true }
        );
        
        if (prStatus) {
            try {
                const statusData = JSON.parse(prStatus);
                if (statusData.state === 'MERGED') {
                    log('PR was successfully merged despite command error!', 'green');
                    mergeSuccessful = true;
                }
            } catch (parseError) {
                debugLog(`Failed to parse PR status: ${parseError.message}`);
            }
        }
    }
    
    if (!mergeSuccessful) {
        log('❌ Failed to merge pull request.', 'red');
        log('This usually indicates merge conflicts or other issues.', 'yellow');
        log(`Please check the PR manually: https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`, 'yellow');
        log('Common solutions:', 'cyan');
        log('  1. Resolve merge conflicts by rebasing your branch on main', 'cyan');
        log('  2. Ensure all required status checks have passed', 'cyan');
        log('  3. Check if the PR has been manually merged already', 'cyan');
        process.exit(1);
    }
    
    log(`✅ Pull request #${prNumber} merged and branch deleted`, 'green');
    
    // Create release
    await createRelease(version);
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        log(`Unexpected error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main };
