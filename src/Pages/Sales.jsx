import React, { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAppContext } from '../context/AppContext'

const getTodayDate = () => new Date().toISOString().slice(0, 10)

const currencySymbols = {
  FCFA: 'FCFA',
  USD: '$',
  NGN: '₦',
}

const sortOptions = [
  { value: 'quantity-desc', label: 'Highest Quantity Sold' },
  { value: 'quantity-asc', label: 'Lowest Quantity Sold' },
  { value: 'revenue-desc', label: 'Highest Revenue' },
  { value: 'revenue-asc', label: 'Lowest Revenue' },
]

const pageSize = 10

const Sales = () => {
  const { products, finishedGoods, salesLogs, recordSale } = useAppContext()

  const [salesForm, setSalesForm] = useState({
    productId: '',
    quantitySold: '',
    saleDate: getTodayDate(),
    unitPrice: '',
  })
  const [salesDownloadFormat, setSalesDownloadFormat] = useState('pdf')
  const [productFilter, setProductFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [sortBy, setSortBy] = useState('quantity-desc')
  const [currentPage, setCurrentPage] = useState(1)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(salesForm.productId)),
    [products, salesForm.productId]
  )

  const availableQuantity = useMemo(() => {
    if (!selectedProduct) {
      return 0
    }

    const stock = finishedGoods.find((item) => item.productId === selectedProduct.id)
    return Number(stock?.quantity || 0)
  }, [selectedProduct, finishedGoods])

  const filteredSales = useMemo(() => {
    return salesLogs.filter((sale) => {
      if (productFilter !== 'all' && sale.productId !== Number(productFilter)) {
        return false
      }

      const saleDateValue = sale.saleDate || ''

      if (fromDate && saleDateValue < fromDate) {
        return false
      }

      return true
    })
  }, [salesLogs, productFilter, fromDate])

  const sortedSales = useMemo(() => {
    const salesCopy = [...filteredSales]

    if (sortBy === 'quantity-desc') {
      return salesCopy.sort((a, b) => b.quantitySold - a.quantitySold)
    }

    if (sortBy === 'quantity-asc') {
      return salesCopy.sort((a, b) => a.quantitySold - b.quantitySold)
    }

    if (sortBy === 'revenue-desc') {
      return salesCopy.sort((a, b) => b.totalAmount - a.totalAmount)
    }

    return salesCopy.sort((a, b) => a.totalAmount - b.totalAmount)
  }, [filteredSales, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedSales.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedSales = sortedSales.slice((safePage - 1) * pageSize, safePage * pageSize)

  const clearFilters = () => {
    setProductFilter('all')
    setFromDate('')
    setSortBy('quantity-desc')
    setCurrentPage(1)
  }

  const handleSalesFormChange = (event) => {
    const { name, value } = event.target

    if (name === 'productId') {
      const matchingProduct = products.find((product) => product.id === Number(value))
      setSalesForm((prevForm) => ({
        ...prevForm,
        productId: value,
        unitPrice: matchingProduct ? String(matchingProduct.unitPrice || 0) : '',
      }))
      return
    }

    setSalesForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }))
  }

  const handleRecordSale = async (event) => {
    event.preventDefault()

    const result = await recordSale(salesForm)
    if (result.message) {
      window.alert(result.message)
    }

    if (result.ok) {
      setSalesForm({
        productId: '',
        quantitySold: '',
        saleDate: getTodayDate(),
        unitPrice: '',
      })
      setCurrentPage(1)
    }
  }

  const downloadSalesReport = () => {
    const rowsToDownload = paginatedSales

    if (rowsToDownload.length === 0) {
      window.alert('No sales data available for current filters.')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (salesDownloadFormat === 'pdf') {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()

      pdf.setFontSize(18)
      pdf.text('Production Tracker', pageWidth / 2, 34, { align: 'center' })
      pdf.setFontSize(15)
      pdf.text('Sales Report', pageWidth / 2, 54, { align: 'center' })

      autoTable(pdf, {
        startY: 78,
        head: [['Product', 'Quantity Sold', 'Unit Price', 'Total Amount', 'Quantity Left', 'Sale Date']],
        body: rowsToDownload.map((sale) => {
          const symbol = currencySymbols[sale.unitCurrency] || '$'
          return [
            sale.productName,
            String(sale.quantitySold),
            `${Number(sale.unitPrice).toFixed(2)} ${symbol}`,
            `${Number(sale.totalAmount).toFixed(2)} ${symbol}`,
            String(sale.quantityLeft),
            new Date(`${sale.saleDate}T12:00:00`).toLocaleDateString(),
          ]
        }),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [39, 174, 96] },
        margin: { left: 40, right: 40 },
      })

      pdf.save(`sales-report-${timestamp}.pdf`)
      return
    }

    const headers = ['Product', 'Quantity Sold', 'Unit Price', 'Total Amount', 'Quantity Left', 'Sale Date']
    const csvRows = rowsToDownload.map((sale) => {
      const symbol = currencySymbols[sale.unitCurrency] || '$'
      return [
        sale.productName,
        sale.quantitySold,
        `${Number(sale.unitPrice).toFixed(2)} ${symbol}`,
        `${Number(sale.totalAmount).toFixed(2)} ${symbol}`,
        sale.quantityLeft,
        sale.saleDate,
      ]
    })

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `sales-report-${timestamp}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="page-grid">
      <section className="page-card sales-toolbar-card">
        <div className="report-toolbar">
          <div className="report-filter-head">
            <h1 className="report-filter-title">Sales Production Unit</h1>
            <p className="muted-text report-filter-subtitle">
              Record sales, track quantity left, and download filtered sales reports.
            </p>
          </div>

          <div className="report-download-controls">
            <select
              value={salesDownloadFormat}
              onChange={(event) => setSalesDownloadFormat(event.target.value)}
              aria-label="Select sales report format"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel (.csv)</option>
            </select>
            <button type="button" className="button-secondary" onClick={downloadSalesReport}>
              Download Sales Report
            </button>
          </div>
        </div>
      </section>

      <section className="page-card">
        <h2>Record Sale</h2>
        <form className="form-grid" onSubmit={handleRecordSale}>
          <label htmlFor="saleProductId">Product Name</label>
          <select
            id="saleProductId"
            name="productId"
            value={salesForm.productId}
            onChange={handleSalesFormChange}
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.productName}
              </option>
            ))}
          </select>

          <label htmlFor="quantitySold">Quantity Sold</label>
          <input
            id="quantitySold"
            name="quantitySold"
            type="number"
            min="1"
            value={salesForm.quantitySold}
            onChange={handleSalesFormChange}
            placeholder="e.g. 5"
          />

          <label htmlFor="saleDate">Sale Date</label>
          <input
            id="saleDate"
            name="saleDate"
            type="date"
            value={salesForm.saleDate}
            onChange={handleSalesFormChange}
          />

          <label htmlFor="saleUnitPrice">Unit Price</label>
          <input
            id="saleUnitPrice"
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            value={salesForm.unitPrice}
            onChange={handleSalesFormChange}
            placeholder="Auto-filled from product configuration"
          />

          <p className="muted-text">
            Quantity Left: <strong>{availableQuantity}</strong>
          </p>

          <div className="inline-actions">
            <button type="submit">Record Sale</button>
          </div>
        </form>
      </section>

      <section className="page-card">
        <h2>Sales Summary</h2>

        <div className="inline-actions compact-actions report-filter-controls">
          <select
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.productName}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value)
              setCurrentPage(1)
            }}
            aria-label="Filter by date"
          />

          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value)
              setCurrentPage(1)
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" className="button-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity Sold</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>Quantity Left</th>
                <th>Sale Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state-cell">
                    No sales found for selected filters.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => {
                  const symbol = currencySymbols[sale.unitCurrency] || '$'

                  return (
                    <tr key={sale.id}>
                      <td>{sale.productName}</td>
                      <td>{sale.quantitySold}</td>
                      <td>
                        {Number(sale.unitPrice || 0).toFixed(2)} {symbol}
                      </td>
                      <td>
                        {Number(sale.totalAmount || 0).toFixed(2)} {symbol}
                      </td>
                      <td>{sale.quantityLeft}</td>
                      <td>{new Date(`${sale.saleDate}T12:00:00`).toLocaleDateString()}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="report-pagination-controls sales-pagination-row">
          <button
            type="button"
            className="button-secondary"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
          >
            Prev
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}

export default Sales
