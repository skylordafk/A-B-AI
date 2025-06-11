# Batch Template Spreadsheet Editor

## Overview

The Batch Template Editor has been redesigned with a spreadsheet-like interface, providing Excel-style functionality for editing batch processing templates. This new editor replaces the previous split-panel design with a familiar grid interface that supports advanced editing features.

## Key Features

### 1. Spreadsheet Interface

- **Grid Layout**: Traditional spreadsheet table with numbered rows and labeled columns
- **Visual Feedback**: Selected cells are highlighted with a blue background and border
- **Excel-like Styling**: Headers, borders, and cell styling similar to popular spreadsheet applications

### 2. Multi-Cell Selection

- **Click and Drag**: Select multiple cells by clicking and dragging
- **Shift+Click**: Extend selection by holding Shift and clicking
- **Visual Selection**: Selected cells are highlighted with a blue background

### 3. Copy/Paste Operations

- **Copy**: `Ctrl+C` (or `Cmd+C` on Mac) to copy selected cells
- **Paste**: `Ctrl+V` (or `Cmd+V` on Mac) to paste at the current selection
- **Cut**: `Ctrl+X` (or `Cmd+X` on Mac) to cut selected cells
- **Multi-Row Support**: Copy and paste entire rows or ranges of cells
- **Tab-Delimited**: Uses tab-delimited format for compatibility with Excel/Google Sheets

### 4. Drag-to-Fill

- **Fill Handle**: Blue square in the bottom-right corner of selection
- **Drag Down**: Click and drag the fill handle to repeat patterns
- **Pattern Recognition**: Automatically continues patterns when filling multiple rows
- **Auto-Create Rows**: Automatically adds new rows when dragging beyond existing data

### 5. Inline Editing

- **Double-Click**: Double-click any cell to edit
- **Direct Input**: Type directly into cells
- **Enter to Confirm**: Press Enter to save changes
- **Escape to Cancel**: Press Escape to cancel editing
- **Smart Controls**:
  - Dropdown for model selection
  - Number input for temperature
  - Textarea for prompts and system messages

### 6. Keyboard Navigation

- **Arrow Keys**: Navigate between cells
- **Enter**: Start editing selected cell
- **Delete/Backspace**: Clear selected cells
- **Tab**: Move to next cell (when editing)
- **Escape**: Cancel selection or editing

### 7. Row Management

- **Add Row**: Click "Add Row" button to append new rows
- **Delete Rows**: Select rows and click "Delete Rows" to remove
- **Auto-numbering**: Rows are automatically numbered

## Usage Guide

### Basic Editing

1. **Click** on any cell to select it
2. **Double-click** to start editing
3. **Type** your content
4. **Press Enter** to save or **Escape** to cancel

### Copying Multiple Rows

1. **Select** the range of cells you want to copy
2. **Press Ctrl+C** to copy
3. **Click** where you want to paste
4. **Press Ctrl+V** to paste

### Using Drag-to-Fill

1. **Select** one or more cells with a pattern
2. **Hover** over the blue square in the bottom-right corner
3. **Drag down** to fill cells below
4. The pattern will repeat automatically

### Bulk Operations

1. **Select multiple cells** by clicking and dragging
2. **Delete** to clear all selected cells
3. **Copy/Paste** to duplicate entire sections
4. **Export** to save as CSV at any time

## Column Reference

| Column         | Description               | Type     | Notes                    |
| -------------- | ------------------------- | -------- | ------------------------ |
| Prompt         | The main prompt text      | Text     | Required field           |
| System Message | System context for the AI | Text     | Optional                 |
| Model          | AI model to use           | Dropdown | Defaults to GPT-4o       |
| Temperature    | Creativity setting        | Number   | Range: 0-2, Default: 0.7 |

## Tips and Shortcuts

- **Quick Edit**: Press F2 or Enter to start editing the selected cell
- **Cancel Edit**: Press Escape while editing to revert changes
- **Select All**: Ctrl+A to select all cells (when implemented)
- **Undo/Redo**: Standard undo/redo shortcuts (when implemented)
- **Excel Import**: Copy data from Excel and paste directly into the editor

## Technical Details

The spreadsheet editor is built with:

- React hooks for state management
- Custom event handlers for mouse and keyboard interactions
- CSS Grid for optimal performance with large datasets
- Tab-delimited clipboard format for cross-application compatibility

## Benefits

1. **Familiar Interface**: Users comfortable with Excel/Google Sheets will feel at home
2. **Efficiency**: Bulk operations save time when working with large templates
3. **Flexibility**: Easy to modify, copy, and reorganize data
4. **No Learning Curve**: Standard spreadsheet conventions and shortcuts
5. **Data Integrity**: Visual feedback prevents accidental edits
