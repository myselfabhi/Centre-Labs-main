const ExcelJS = require('exceljs');
const { formatToLocal } = require('../utils/timezoneUtils');

/**
 * Generate an Excel report buffer for a list of orders.
 */
async function generateOrdersExcel(orders, title = 'Orders Report') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    // Header defining columns
    worksheet.columns = [
        { header: 'Order Number', key: 'orderNumber', width: 25 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Customer Email', key: 'customerEmail', width: 30 },
        { header: 'Order Date', key: 'datePST', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Total Amount ($)', key: 'totalAmount', width: 18 },
        { header: 'Item Count', key: 'itemCount', width: 12 },
        { header: 'Sales Channel', key: 'salesChannel', width: 25 },
        { header: 'Payment Status', key: 'paymentStatus', width: 18 },
    ];

    // Add rows
    orders.forEach(order => {
        worksheet.addRow({
            orderNumber: order.orderNumber || order.id,
            customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
            customerEmail: order.customer?.email || 'N/A',
            datePST: formatToLocal(order.createdAt),
            status: order.status,
            totalAmount: Number(order.totalAmount || 0).toFixed(2),
            itemCount: order.items?.length || 0,
            salesChannel: order.salesChannel?.companyName || (order.partnerOrderId ? 'Partner' : 'Centre Labs'),
            paymentStatus: order.payments && order.payments.length > 0 ? order.payments[0].status : 'PENDING',
        });
    });

    // Make the header row bold
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' } // Dark blue header
    };

    // Auto-filter
    worksheet.autoFilter = 'A1:I1';

    // Return the buffer
    return await workbook.xlsx.writeBuffer();
}

/**
 * Generate a Sales Analytics report buffer.
 */
async function generateSalesAnalyticsExcel(data, rangeDescription) {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Sales Analytics Report Summary']);
    summarySheet.addRow(['Period:', rangeDescription]);
    summarySheet.addRow(['Generated At (Local):', formatToLocal(new Date())]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Revenue:', `$${Number(data.totalRevenue || 0).toFixed(2)}`]);
    summarySheet.addRow(['Total Orders:', data.totalOrders || 0]);

    summarySheet.getRow(1).font = { size: 16, bold: true };
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 25;

    // Sheet 2: Daily Breakdown
    const dailySheet = workbook.addWorksheet('Daily Breakdown');
    dailySheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Revenue ($)', key: 'revenue', width: 15 },
        { header: 'Orders', key: 'orders', width: 15 },
    ];

    if (data.daily) {
        data.daily.forEach(d => {
            dailySheet.addRow({
                date: d.date,
                revenue: Number(d.revenue || 0).toFixed(2),
                orders: d.orders || 0
            });
        });
    }

    dailySheet.getRow(1).font = { bold: true };

    return await workbook.xlsx.writeBuffer();
}

module.exports = {
    generateOrdersExcel,
    generateSalesAnalyticsExcel
};
