import html2canvas from 'html2canvas';

export async function generatePDF(elementId: string, filename: string) {
  try {
    console.log('Starting grid capture...');
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    // Capture the grid with its exact dimensions
    const canvas = await html2canvas(element, {
      // Preserve exact layout
      width: element.offsetWidth,
      height: element.offsetHeight,
      // Use exact pixel ratio for accurate rendering
      scale: window.devicePixelRatio,
      // Don't modify anything
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      // Ensure proper rendering of all elements
      logging: true,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Force visible state for all elements
          const allElements = clonedElement.getElementsByTagName('*');
          Array.from(allElements).forEach(el => {
            const element = el as HTMLElement;
            if (window.getComputedStyle(element).opacity === '0') {
              element.style.opacity = '1';
            }
          });
        }
      }
    });

    // Simple download as PNG
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error('Failed to generate image');
        }
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace('.pdf', '.png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      'image/png',
      1.0
    );

    return true;

  } catch (error) {
    console.error('Error in grid capture:', error);
    throw error;
  }
}