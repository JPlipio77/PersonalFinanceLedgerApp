const { createObjectCsvStringifier } = require('csv-writer');
const ExcelJS = require('exceljs');
const { format } = require('date-fns');

const HEADERS = [
  { id: 'date',        title: 'Date' },
  { id: 'type',        title: 'Type' },
  { id: 'description', title: 'Description' },
  { id: 'category',    title: 'Category' },
  { id: 'amount',      title: 'Amount' },
  { id: 'currency',    title: 'Currency' },
];

const toRows = (transactions) =>
  transactions.map((tx) => ({
    date:        format(new Date(tx.date), 'yyyy-MM-dd'),
    type:        tx.type,
    description: tx.description,
    category:    tx.category?.name || '',
    amount:      tx.amount.toFixed(2),
    currency:    tx.currency,
  }));

const exportTransactions = async (transactions, fmt) => {
  const rows = toRows(transactions);

  if (fmt === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    sheet.columns = HEADERS.map((h) => ({ header: h.title, key: h.id, width: 18 }));
    sheet.addRows(rows);
    // Bold header row
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `transactions-${Date.now()}.xlsx`,
    };
  }

  // Default: CSV
  const csvStringifier = createObjectCsvStringifier({ header: HEADERS });
  const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
  return {
    buffer: Buffer.from(csv, 'utf-8'),
    contentType: 'text/csv',
    filename: `transactions-${Date.now()}.csv`,
  };
};

module.exports = { exportTransactions };
