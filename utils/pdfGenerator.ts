import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDF(elementId: string, filename: string) {
  try {
    console.log('Starting PDF generation...');
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    // Wait for all images to load
    const images = element.getElementsByTagName('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve(null);
            } else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            }
          })
      )
    );

    console.log('All images loaded, generating canvas...');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: true,
      backgroundColor: '#ffffff',
      allowTaint: true,
      foreignObjectRendering: true
    });

    console.log('Canvas generated, creating PDF...');

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      hotfixes: ['px_scaling']
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Generate PDF as blob
    const pdfBlob = pdf.output('blob');
    
    // Create download link
    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    console.log('PDF downloaded successfully');
    return true;

  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
}