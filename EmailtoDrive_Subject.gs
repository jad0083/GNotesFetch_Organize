/**
 * Universal Scraper: Filters by subject keywords/patterns.
 * Saves all attachments and copies ALL linked Google Workspace products.
 *   
 * sacramentoj@
 * 
 */
 
function downloadEverythingbySubject() {
  // --- CONFIGURATION ---
  const FOLDER_ID = '<your-staging-folder-id>';            // e.g. '1qgiSlFnzKO5Q1sRE00xi2Vzt3VGYL_qY' — same staging folder used by EmailtoDrive_Sender.gs

  // List your subject keywords here.
  // It will find emails containing ANY of these (Case-Insensitive).
  const SUBJECT_KEYWORDS = ['<subject-keyword-1>'];        // e.g. ['Document shared with you:', 'Invoice', 'Weekly Report'] — add as many as needed

  const PROCESSED_LABEL = '<gmail-label-name>';            // e.g. 'ProcessedSaved' — should match the label used in EmailtoDrive_Sender.gs
  // ---------------------

  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    let label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);

    // 1. Build the "OR" search query for subjects
    const subjectPart = SUBJECT_KEYWORDS.map(s => `subject:"${s}"`).join(' OR ');
    const finalQuery = `(${subjectPart}) -label:${PROCESSED_LABEL} in:anywhere`;
    
    Logger.log("Searching with query: " + finalQuery);

    const threads = GmailApp.search(finalQuery, 0, 15);

    if (threads.length === 0) {
      Logger.log("No new emails found matching those subjects.");
      return;
    }

    // Helper: Check for duplicates in Drive folder
    const fileExists = (name) => folder.getFilesByName(name).hasNext();

    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        
        // --- 2. HANDLE PHYSICAL ATTACHMENTS ---
        const attachments = message.getAttachments();
        attachments.forEach(attachment => {
          const name = attachment.getName();
          if (!fileExists(name)) {
            folder.createFile(attachment);
            Logger.log("SAVED ATTACHMENT: " + name);
          }
        });

        // --- 3. HANDLE GOOGLE WORKSPACE LINKS (Docs, Sheets, Slides, Videos) ---
        const body = message.getBody();
        const universalDriveRegex = /https:\/\/(?:docs|drive|script|sites)\.google\.com\/[^\s"'>]+/g;
        const links = body.match(universalDriveRegex);

        if (links) {
          const uniqueLinks = [...new Set(links)]; // Remove duplicate links in same email
          
          uniqueLinks.forEach(url => {
            try {
              const idMatch = url.match(/[-\w]{25,}/);
              if (idMatch) {
                const fileId = idMatch[0];
                const file = DriveApp.getFileById(fileId);
                const name = file.getName();

                if (!fileExists(name)) {
                  file.makeCopy(name, folder);
                  Logger.log("COPIED WORKSPACE ITEM: " + name);
                } else {
                  Logger.log("SKIPPED (Already in Drive): " + name);
                }
              }
            } catch (e) {
              // Usually permissions or link is a folder, not a file
              Logger.log("SKIPPED LINK (No Access or Folder): " + url);
            }
          });
        }
      });

      // 4. Mark thread as processed
      thread.addLabel(label);
    });

  } catch (e) {
    Logger.log("CRITICAL ERROR: " + e.toString());
  }
}