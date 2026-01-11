/**
 * Print Ticket Utility
 * Generates a thermal printer-friendly receipt
 */

const TICKET_WIDTH = 48; // Characters for 80mm thermal printer

/**
 * Center text within the ticket width
 */
const centerText = (text, width = TICKET_WIDTH) => {
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text;
};

/**
 * Create a line separator
 */
const separator = (char = '-', width = TICKET_WIDTH) => char.repeat(width);

/**
 * Format a line with left and right aligned text
 */
const formatLine = (left, right, width = TICKET_WIDTH) => {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
};

/**
 * Format currency for display
 */
const formatMoney = (amount) => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Format date for display
 */
const formatDate = (date = new Date()) => {
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Generate ticket content for a sale
 * @param {Object} sale - Sale data
 * @param {Object} storeConfig - Store configuration
 * @returns {string} - Formatted ticket string
 */
export const generateTicket = (sale, storeConfig = {}) => {
  const lines = [];
  
  // Header
  lines.push(separator('='));
  lines.push(centerText(storeConfig.name || 'TIENDA'));
  if (storeConfig.address) {
    lines.push(centerText(storeConfig.address));
  }
  if (storeConfig.phone) {
    lines.push(centerText(`Tel: ${storeConfig.phone}`));
  }
  lines.push(separator('='));
  
  // Sale Info
  lines.push('');
  lines.push(formatLine('Fecha:', formatDate(sale.date)));
  lines.push(formatLine('Folio:', sale.id || 'N/A'));
  lines.push(formatLine('Vendedor:', sale.userName || 'N/A'));
  if (sale.customerName && sale.customerName !== 'Cliente Mostrador') {
    lines.push(formatLine('Cliente:', sale.customerName));
  }
  lines.push('');
  lines.push(separator());
  
  // Items Header
  lines.push('CANT  DESCRIPCION              IMPORTE');
  lines.push(separator());
  
  // Items
  if (sale.items && sale.items.length > 0) {
    sale.items.forEach(item => {
      const qty = item.quantity.toString().padEnd(5);
      const name = item.name?.substring(0, 22).padEnd(22) || 'Producto';
      const price = formatMoney(item.finalPrice || (item.price * item.quantity));
      lines.push(`${qty} ${name} ${price.padStart(8)}`);
      
      // Show discount if applicable
      if (item.promoDiscount > 0) {
        lines.push(`      Desc: -${formatMoney(item.promoDiscount)}`);
      }
    });
  }
  
  lines.push(separator());
  
  // Totals
  lines.push('');
  lines.push(formatLine('Subtotal:', formatMoney(sale.subtotal || 0)));
  
  if (sale.promoDiscount > 0) {
    lines.push(formatLine('Promociones:', `-${formatMoney(sale.promoDiscount)}`));
  }
  
  if (sale.vipDiscount > 0) {
    lines.push(formatLine('Desc. VIP:', `-${formatMoney(sale.vipDiscount)}`));
  }
  
  lines.push(separator());
  lines.push(formatLine('TOTAL:', formatMoney(sale.total || 0)));
  lines.push(separator());
  
  // Payment Info
  lines.push('');
  const paymentLabels = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  };
  lines.push(formatLine('Pago:', paymentLabels[sale.paymentMethod] || sale.paymentMethod));
  
  if (sale.paymentMethod === 'cash' && sale.cashReceived) {
    lines.push(formatLine('Recibido:', formatMoney(sale.cashReceived)));
    lines.push(formatLine('Cambio:', formatMoney(sale.cashReceived - sale.total)));
  }
  
  // Footer
  lines.push('');
  lines.push(separator('='));
  lines.push(centerText(storeConfig.ticketFooter || 'Gracias por su compra'));
  lines.push(separator('='));
  lines.push('');
  
  return lines.join('\n');
};

/**
 * Print ticket using browser print dialog
 * @param {string} ticketContent - The formatted ticket string
 */
export const printTicket = (ticketContent) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir.');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket de Venta</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @media print {
            body {
              margin: 0;
              padding: 5mm;
            }
          }
        </style>
      </head>
      <body>${ticketContent}</body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };
};

/**
 * Generate and print a ticket for a sale
 * @param {Object} sale - Sale data
 * @param {Object} storeConfig - Store configuration
 */
export const printSaleTicket = (sale, storeConfig) => {
  const ticketContent = generateTicket(sale, storeConfig);
  printTicket(ticketContent);
};

export default {
  generateTicket,
  printTicket,
  printSaleTicket
};
