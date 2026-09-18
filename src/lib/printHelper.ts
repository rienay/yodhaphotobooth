// Physical print sizes (cm) per layout
export const PRINT_SIZES: Record<string, { w: number; h: number; sheets: number; label: string }> = {
  "3x1": { w: 5, h: 15, sheets: 2, label: "5×15 cm · 2 strip (1 lembar 4R)" },
  "3x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar (4R)" },
  "2x1": { w: 5, h: 15, sheets: 2, label: "5×15 cm · 2 strip (1 lembar 4R)" },
  "1x1": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar (4R)" },
  "2x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar (4R)" },
  "4x2": { w: 10, h: 15, sheets: 1, label: "10×15 cm · 1 lembar (4R)" },
};

export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function printPhotoStrip(
  stripUrl: string,
  layout: string = "3x1",
  printCopies: number = 1
): Promise<void> {
  const info = PRINT_SIZES[layout] || { w: 10, h: 15, sheets: 1, label: "10×15 cm" };
  const sheetWidth = layout === "3x1" || layout === "2x1" ? info.w * 2 : info.w;
  const sheetHeight = info.h;

  let blobUrl = stripUrl;
  if (stripUrl.startsWith("data:")) {
    const blob = dataURLtoBlob(stripUrl);
    blobUrl = URL.createObjectURL(blob);
  } else if (stripUrl.startsWith("http://") || stripUrl.startsWith("https://")) {
    try {
      const resp = await fetch(stripUrl, { mode: "cors" });
      if (resp.ok) {
        const blob = await resp.blob();
        blobUrl = URL.createObjectURL(blob);
      }
    } catch {
      blobUrl = stripUrl;
    }
  }

  let pagesContent = "";

  if (layout === "3x1" || layout === "2x1") {
    // 5x15cm photostrip: 2 strip per 10x15cm (4R) page
    const totalSheets = Math.ceil(printCopies / 2);
    let remainingCopies = printCopies;

    for (let s = 0; s < totalSheets; s++) {
      if (remainingCopies >= 2) {
        pagesContent += `
          <div class="page">
            <div class="print-container">
              <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
              <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
            </div>
          </div>
        `;
        remainingCopies -= 2;
      } else {
        pagesContent += `
          <div class="page">
            <div class="print-container">
              <div style="width:50%; height:100%;"></div>
              <img src="${blobUrl}" style="width:50%;height:100%;display:block;object-fit:contain;" />
            </div>
          </div>
        `;
        remainingCopies -= 1;
      }
    }
  } else {
    // 10x15cm full photo (3x2, 1x1, 2x2, 4x2)
    for (let c = 0; c < printCopies; c++) {
      pagesContent += `
        <div class="page">
          <div class="print-container">
            <img src="${blobUrl}" style="width:100%;height:100%;display:block;object-fit:contain;" />
          </div>
        </div>
      `;
    }
  }

  // If running inside Electron Desktop App, execute silent print directly
  if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${sheetWidth}cm ${sheetHeight}cm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            width: 100%;
            height: 100%;
          }
          .page {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .print-container {
            width: ${sheetWidth}cm;
            height: ${sheetHeight}cm;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 0.25cm;
          }
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${pagesContent}
      </body>
      </html>
    `;
    const selectedPrinter = localStorage.getItem("yodha_selected_printer") || undefined;
    const res = await window.electronAPI.printSilent({
      html: fullHtml,
      printerName: selectedPrinter,
      copies: 1,
    });
    if (blobUrl && blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
    if (res.success) {
      return;
    }
    console.warn("Electron silent print failed, falling back to browser print:", res.failureReason || res.error);
  }

  // Remove existing print container and style if any
  const existingSection = document.getElementById("yodha-print-section");
  if (existingSection) existingSection.remove();
  const existingStyle = document.getElementById("yodha-print-style");
  if (existingStyle) existingStyle.remove();

  const printDiv = document.createElement("div");
  printDiv.id = "yodha-print-section";
  printDiv.innerHTML = pagesContent;
  document.body.appendChild(printDiv);

  const printStyle = document.createElement("style");
  printStyle.id = "yodha-print-style";
  printStyle.innerHTML = `
    @media print {
      body > *:not(#yodha-print-section) {
        display: none !important;
      }
      html, body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #yodha-print-section {
        display: block !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      @page {
        size: ${sheetWidth}cm ${sheetHeight}cm;
        margin: 0;
      }
      .page {
        width: 100vw !important;
        height: 100vh !important;
        position: relative !important;
        page-break-after: always !important;
        break-after: page !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: white !important;
      }
      .print-container {
        width: ${sheetWidth}cm !important;
        height: ${sheetHeight}cm !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        padding: 0.25cm !important;
        box-sizing: border-box !important;
      }
      img {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
  document.head.appendChild(printStyle);

  const cleanup = () => {
    const el = document.getElementById("yodha-print-section");
    if (el) el.remove();
    const st = document.getElementById("yodha-print-style");
    if (st) st.remove();
    if (blobUrl && blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const imgs = Array.from(printDiv.querySelectorAll("img"));
  if (imgs.length === 0) {
    window.print();
    cleanup();
    return;
  }

  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  setTimeout(() => {
    window.print();
    cleanup();
  }, 400);
}
