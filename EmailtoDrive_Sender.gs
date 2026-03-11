/**
 * Saves all attachments and copies ALL linked Google Workspace 
 * products (Docs, Sheets, Slides, Videos, etc.) from a specific sender to the specified
 * Google Drive.  Process is batches to prevent timeout, so more frequent runtime.
 * 
 * sacramentoj@
 * 
 */
function downloadEverythingFromSender() {
  // --- CONFIGURATION ---
  const FOLDER_ID = '1qgiSlFnzKO5Q1sRE00xi2Vzt3VGYL_qY'; 
  const SENDER_EMAIL = 'gemini-notes@google.com'; 
  const PROCESSED_LABEL = 'ProcessedSaved';
  // ---------------------

  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    let label = GmailApp.getUserLabelByName(PROCESSED_LABEL) || GmailApp.createLabel(PROCESSED_LABEL);

    // Search query: Specific sender, not yet processed
    const query = `from:${SENDER_EMAIL} -label:${PROCESSED_LABEL} in:anywhere`;
    const threads = GmailApp.search(query, 0, 10);

    if (threads.length === 0) {
      Logger.log("No new emails found from " + SENDER_EMAIL);
      return;
    }

    // Helper: Prevent duplicates by checking filename in the folder
    const fileExists = (name) => folder.getFilesByName(name).hasNext();

    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        
        // 1. PHYSICAL ATTACHMENTS (PDF, Images, ZIP, Office docs)
        const attachments = message.getAttachments();
        attachments.forEach(attachment => {
          const name = attachment.getName();
          if (!fileExists(name)) {
            folder.createFile(attachment);
            Logger.log("SAVED ATTACHMENT: " + name);
          }
        });

        // 2. LINKED GOOGLE WORKSPACE PRODUCTS
        // This Regex finds all variations: docs.google.com/document, /spreadsheets, /presentation, /file, /forms, etc.
        const body = message.getBody();
        const universalDriveRegex = /https:\/\/(?:docs|drive|script|sites)\.google\.com\/[^\s"'>]+/g;
        const links = body.match(universalDriveRegex);

        if (links) {
          // Remove duplicate links within the same email
          const uniqueLinks = [...new Set(links)];
          
          uniqueLinks.forEach(url => {
            try {
              // Extract the File ID (the long string of characters)
              const idMatch = url.match(/[-\w]{25,}/);
              if (idMatch) {
                const fileId = idMatch[0];
                const file = DriveApp.getFileById(fileId);
                const name = file.getName();

                if (!fileExists(name)) {
                  // This copies Docs, Sheets, Slides, Videos, etc. directly
                  file.makeCopy(name, folder);
                  Logger.log("COPIED WORKSPACE ITEM: " + name);
                } else {
                  Logger.log("SKIPPED (Already in Drive): " + name);
                }
              }
            } catch (e) {
              // This happens if the link isn't a file (like a folder link) 
              // or if you don't have "View" permissions on the shared doc.
              Logger.log("SKIPPED LINK (Access Denied or Not a File): " + url);
            }
          });
        }
      });

      // 3. Mark as processed
      thread.addLabel(label);
    });

  } catch (e) {
    Logger.log("CRITICAL ERROR: " + e.toString());
  }
}