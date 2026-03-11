/**
 * Sort and Move:
 * 1. Categorizes files via filters.txt.
 * 2. Redirects any files that already exist in the target to a DUPLICATE folder.
 * 3. Categorizes non-matches as "Unsorted".
 * 4. Logs every action into individual category log files.
 * 
 * sacramentoj@
 * 
 */
function moveStagingtoNotesV2() {
  // --- CONFIGURATION ---
  const SOURCE_FOLDER_ID  = '1qgiSlFnzKO5Q1sRE00xi2Vzt3VGYL_qY';
  const PARENT_DEST_ID    = '1XX6gLGtXEtzcHNcVll3Wor_HYNFr6EA9';
  const LOG_FOLDER_ID     = '1OLI7XOiViTYFeijEr8HKMWflASzJK4Hz';
  const FILTER_FOLDER_ID  = '1lSZ3-bkwLrt4c-jUEd3JX9XaNg6y5k1Z';
  const DUP_FOLDER_ID     = '1ZaX8nrkvuArsFLJfRl8rjEJKgjfvQCy9'; // Folder for duplicates
  
  const FILTER_FILE_NAME  = 'filters.txt';
  const UNSORTED_NAME     = 'Misc';
  // ---------------------

  console.log("--- Starting Execution: " + new Date().toLocaleString() + " ---");

  const sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  const parentDest   = DriveApp.getFolderById(PARENT_DEST_ID);
  const logFolder    = DriveApp.getFolderById(LOG_FOLDER_ID);
  const filterFolder = DriveApp.getFolderById(FILTER_FOLDER_ID);
  const dupFolder    = DriveApp.getFolderById(DUP_FOLDER_ID);

  // 1. READ FILTER FILE
  const filterFiles = filterFolder.getFilesByName(FILTER_FILE_NAME);
  if (!filterFiles.hasNext()) {
    console.error("CRITICAL ERROR: filter file '" + FILTER_FILE_NAME + "' not found.");
    return;
  }
  const rawContent = filterFiles.next().getBlob().getDataAsString();
  const categoryMap = parseAllFilters(rawContent);
  console.log("Filters loaded for categories: " + Object.keys(categoryMap).join(", "));

  // 2. PROCESS FILES
  const files = sourceFolder.getFiles();
  const timestamp = new Date().toLocaleString();
  let moveCount = 0;
  let dupCount = 0;

  while (files.hasNext()) {
    let file = files.next();
    let fileName = file.getName();
    let targetCategory = UNSORTED_NAME;
    let isMatch = false;

    // Determine intended category
    for (let category in categoryMap) {
      const filters = categoryMap[category];
      if (filters.some(f => fileName.toLowerCase().includes(f.toLowerCase()))) {
        targetCategory = category;
        isMatch = true;
        break; 
      }
    }

    // Define target folder and check for existing file
    const targetFolder = getOrCreateSubfolder(parentDest, targetCategory);
    const existingInTarget = targetFolder.getFilesByName(fileName);

    if (existingInTarget.hasNext()) {
      // DUPLICATE LOGIC: Move to dedicated Duplicates folder
      file.moveTo(dupFolder);
      dupCount++;
      
      let logText = `[${timestamp}] DUPLICATE DETECTED: "${fileName}" already in "${targetCategory}". Moved to Duplicate Archive.\n`;
      updateSpecificLog(logFolder, `Duplicates_log.txt`, logText);
      console.warn(`[DUPLICATE] ${fileName} moved to Duplicate Folder.`);
    } else {
      // NORMAL MOVE: Move to category or unsorted
      file.moveTo(targetFolder);
      moveCount++;
      
      let logText = `[${timestamp}] MOVED: "${fileName}" (ID: ${file.getId()})\n`;
      updateSpecificLog(logFolder, `${targetCategory}_log.txt`, logText);
      console.log(`[OK] ${fileName} -> ${targetCategory}`);
    }
  }

  console.log(`--- Summary: Moved ${moveCount} files, Archived ${dupCount} duplicates. ---`);
}

/**
 * Parses the text file into a map of categories.
 */
function parseAllFilters(content) {
  const lines = content.split(/\r?\n/);
  const map = {};
  let currentCategory = null;

  for (let line of lines) {
    let cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) continue;

    if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
      currentCategory = cleanLine.substring(1, cleanLine.length - 1);
      map[currentCategory] = [];
    } else if (currentCategory) {
      map[currentCategory].push(cleanLine);
    }
  }
  return map;
}

/**
 * Helper: Gets/Creates subfolder.
 */
function getOrCreateSubfolder(parent, name) {
  const subfolders = parent.getFoldersByName(name);
  return subfolders.hasNext() ? subfolders.next() : parent.createFolder(name);
}

/**
 * Helper: Logs to a specific filename in the log folder.
 */
function updateSpecificLog(folder, fileName, text) {
  const files = folder.getFilesByName(fileName);
  let logFile;
  
  if (files.hasNext()) {
    logFile = files.next();
    const currentContent = logFile.getBlob().getDataAsString();
    logFile.setContent(currentContent + text);
  } else {
    logFile = folder.createFile(fileName, text);
  }
}