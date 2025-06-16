# A-B/AI v1.1.0 Release Notes

## 🚀 Major New Feature: Batch Processing

We're excited to introduce **Batch Processing** - a powerful new feature that allows you to process multiple AI requests efficiently with comprehensive cost analysis.

### ✨ Key Features

**📊 Batch File Processing**
- Support for CSV and JSON file uploads
- Drag-and-drop interface for easy file handling
- Automatic validation and error reporting
- Template files provided for easy setup

**💰 Advanced Cost Management**
- Real-time cost estimation before processing
- Dry-run mode to preview costs without execution
- Detailed cost breakdown by provider and model
- Total cost tracking and reporting

**⚡ Efficient Processing**
- Background job queue with progress tracking
- Concurrent processing with configurable limits
- Real-time progress updates with toast notifications
- Error handling with detailed failure reporting

**📁 Export & Results**
- Export processed results in multiple formats (CSV, JSON)
- Comprehensive results table with filtering and sorting
- Individual row status tracking
- Detailed error messages for failed requests

### 🛠️ Technical Improvements

**Enhanced Conversation History**
- Fixed critical issue where chat interface wasn't passing conversation history to LLMs
- All providers now maintain context across multi-turn conversations
- Improved memory efficiency for long conversations

**Enhanced Theme System**
- Improved dark/light theme toggle
- Better contrast and accessibility
- Consistent theming across all components

**MacOS Build Support**
- First official MacOS build available
- Universal binary supporting both Intel and Apple Silicon
- DMG installer for easy installation

### 🐛 Bug Fixes

- Fixed various provider-specific issues
- Improved error handling across all AI providers
- Enhanced stability for long-running sessions
- Better memory management for large conversations
- Fixed pricing calculation inconsistencies

### 📦 Available Downloads

- **Windows**: `.exe` installer and `.zip` portable
- **macOS**: Universal `.dmg` installer (Intel + Apple Silicon)

---

**Full Changelog**: [Compare v1.0.2...v1.1.0](https://github.com/skylordafk/A-B-AI/compare/v1.0.2...v1.1.0) 