# GitHub Release Steps for v1.0.2

Follow these steps to create the official v1.0.2 release on GitHub:

## 1. Merge the Branch (if needed)

If you're on a feature branch:

1. Go to https://github.com/skylordafk/A-B-AI/pull/new/fix-file-scheme
2. Create a pull request to merge into `master`
3. Merge the pull request

## 2. Create the Git Tag

After merging (or if already on master), create the version tag:

```bash
git checkout master
git pull origin master
git tag -a v1.0.2 -m "Release v1.0.2 - Fix packaging issues"
git push origin v1.0.2
```

## 3. Create GitHub Release

### Option A: Via GitHub Web Interface (Recommended)

1. Go to https://github.com/skylordafk/A-B-AI/releases/new
2. Fill in the form:
   - **Choose a tag**: Select `v1.0.2` (or create it)
   - **Release title**: `A-B/AI v1.0.2`
   - **Description**: Copy the contents from `release-notes-v1.0.2.md`
   - **Attach binaries**: Upload `dist/A-BAI-1.0.2-Setup.exe`
   - [ ] This is a pre-release (leave unchecked)
   - [x] Set as the latest release (check this)
3. Click "Publish release"

### Option B: Via GitHub CLI

If you have GitHub CLI installed:

```bash
gh release create v1.0.2 \
  --title "A-B/AI v1.0.2" \
  --notes-file release-notes-v1.0.2.md \
  dist/A-BAI-1.0.2-Setup.exe
```

## 4. Verify the Release

After publishing:

1. Check https://github.com/skylordafk/A-B-AI/releases
2. Verify the download link works: https://github.com/skylordafk/A-B-AI/releases/latest/download/A-BAI-1.0.2-Setup.exe
3. Test downloading and installing on a clean Windows machine

## 5. Update GitHub Pages (Optional)

If you have a project website:

1. Update any download links to point to v1.0.2
2. Update version numbers in documentation

## 6. Trigger Automated Builds (Future)

Once the tag is pushed, the GitHub Actions workflow will:

- Build installers for Windows and macOS
- Create SHA256 checksums
- Automatically attach them to the release

Note: macOS builds require a macOS runner in GitHub Actions.

## Troubleshooting

### If the workflow fails:

1. Check the Actions tab: https://github.com/skylordafk/A-B-AI/actions
2. Common issues:
   - **"Branch not found"**: Make sure you're using `master` not `main`
   - **"Permission denied"**: Check repository settings → Actions → General → Workflow permissions
   - **"Package failed"**: Check that all dependencies are installed

### Manual upload if needed:

If automated builds fail, you can manually upload:

1. Build locally with `pnpm package:win`
2. Upload `dist/A-BAI-1.0.2-Setup.exe` to the release

## Post-Release

1. Monitor for user feedback
2. Check for any reported issues
3. Consider announcing the release on relevant channels

---

**Remember**: The automated workflow is configured to trigger on tags starting with `v`, so make sure to use `v1.0.2` not just `1.0.2`.
