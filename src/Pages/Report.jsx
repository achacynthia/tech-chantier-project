import React, { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { useAppContext } from '../context/AppContext'

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1))
const pageSizeOptions = [10, 20, 50]

const parseDate = (dateValue) => {
  const parsedDate = new Date(dateValue)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const normalizeMaterialKey = (name) => (name || '').trim().toLowerCase()

const paginateRows = (rows, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize

  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    currentPage,
    totalPages,
  }
}

const Report = () => {
  const { materials, products, productionLogs, stockPurchases } = useAppContext()

  const [rawMaterialsDownloadFormat, setRawMaterialsDownloadFormat] = useState('pdf')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedDay, setSelectedDay] = useState('all')
  const [visibleSections, setVisibleSections] = useState({
    stockPurchases: true,
    productionMade: true,
    materialsLeft: true,
  })
  const [stockPage, setStockPage] = useState(1)
  const [productionPage, setProductionPage] = useState(1)
  const [materialsPage, setMaterialsPage] = useState(1)
  const [stockPageSize, setStockPageSize] = useState(10)
  const [productionPageSize, setProductionPageSize] = useState(10)
  const [materialsPageSize, setMaterialsPageSize] = useState(10)
  const [selectedStockItem, setSelectedStockItem] = useState('all')
  const [selectedProductionProduct, setSelectedProductionProduct] = useState('all')
  const [selectedMaterialsLeftStock, setSelectedMaterialsLeftStock] = useState('all')

  const allDates = useMemo(
    () =>
      [
        ...stockPurchases.map((item) => item.createdAt || item.purchaseDate),
        ...productionLogs.map((item) => item.createdAt),
      ].filter(Boolean),
    [stockPurchases, productionLogs]
  )

  const yearOptions = useMemo(() => {
    const years = new Set()

    allDates.forEach((dateValue) => {
      const parsedDate = parseDate(dateValue)
      if (parsedDate) {
        years.add(parsedDate.getFullYear())
      }
    })

    return Array.from(years).sort((a, b) => b - a)
  }, [allDates])

  const stockItemOptions = useMemo(() => {
    const names = new Set()

    materials.forEach((material) => {
      if (material?.name) {
        names.add(material.name)
      }
    })

    stockPurchases.forEach((purchase) => {
      if (purchase?.materialName) {
        names.add(purchase.materialName)
      }
    })

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [materials, stockPurchases])

  const productionProductOptions = useMemo(() => {
    const names = new Set()

    products.forEach((product) => {
      if (product?.productName) {
        names.add(product.productName)
      }
    })

    productionLogs.forEach((log) => {
      if (log?.productName) {
        names.add(log.productName)
      }
    })

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [products, productionLogs])

  const matchesDateFilters = (dateValue) => {
    const parsedDate = parseDate(dateValue)
    if (!parsedDate) {
      return false
    }

    if (selectedYear !== 'all' && parsedDate.getFullYear() !== Number(selectedYear)) {
      return false
    }

    if (selectedMonth !== 'all' && parsedDate.getMonth() + 1 !== Number(selectedMonth)) {
      return false
    }

    if (selectedDay !== 'all' && parsedDate.getDate() !== Number(selectedDay)) {
      return false
    }

    return true
  }

  const filteredStockPurchases = useMemo(
    () => stockPurchases.filter((purchase) => matchesDateFilters(purchase.createdAt || purchase.purchaseDate)),
    [stockPurchases, selectedYear, selectedMonth, selectedDay]
  )

  const filteredProductionLogs = useMemo(
    () => productionLogs.filter((log) => matchesDateFilters(log.createdAt)),
    [productionLogs, selectedYear, selectedMonth, selectedDay]
  )

  const buildUsageMapFromLogs = (logs) => {
    const usageMap = new Map()

    logs.forEach((log) => {
      if (Array.isArray(log.materialSummary) && log.materialSummary.length > 0) {
        log.materialSummary.forEach((summaryItem) => {
          const key = normalizeMaterialKey(summaryItem.materialName)
          const currentUsed = usageMap.get(key) || 0
          usageMap.set(key, Number((currentUsed + Number(summaryItem.used || 0)).toFixed(2)))
        })
        return
      }

      const matchingProduct = products.find((product) => product.id === log.productId)
      if (!matchingProduct) {
        return
      }

      matchingProduct.ingredients.forEach((ingredient) => {
        const key = normalizeMaterialKey(ingredient.materialName)
        const used = Number(ingredient.amountPerUnit) * Number(log.quantity)
        const currentUsed = usageMap.get(key) || 0
        usageMap.set(key, Number((currentUsed + used).toFixed(2)))
      })
    })

    return usageMap
  }

  const buildPurchaseMapFromLogs = (purchaseLogs) => {
    const purchaseMap = new Map()

    purchaseLogs.forEach((purchase) => {
      const key = normalizeMaterialKey(purchase.materialName)
      const currentPurchased = purchaseMap.get(key) || 0
      purchaseMap.set(
        key,
        Number((currentPurchased + Number(purchase.quantityPurchased || 0)).toFixed(2))
      )
    })

    return purchaseMap
  }

  const allUsageMap = useMemo(() => buildUsageMapFromLogs(productionLogs), [productionLogs, products])
  const filteredUsageMap = useMemo(
    () => buildUsageMapFromLogs(filteredProductionLogs),
    [filteredProductionLogs, products]
  )
  const allPurchaseMap = useMemo(() => buildPurchaseMapFromLogs(stockPurchases), [stockPurchases])
  const filteredPurchaseMap = useMemo(
    () => buildPurchaseMapFromLogs(filteredStockPurchases),
    [filteredStockPurchases]
  )

  const materialBalanceRows = useMemo(() => {
    const materialNameSet = new Set()

    materials.forEach((material) => materialNameSet.add(normalizeMaterialKey(material.name)))
    stockPurchases.forEach((purchase) => materialNameSet.add(normalizeMaterialKey(purchase.materialName)))

    const sortedMaterialKeys = Array.from(materialNameSet).sort((a, b) => a.localeCompare(b))

    return sortedMaterialKeys.map((materialKey) => {
      const matchingMaterial = materials.find(
        (material) => normalizeMaterialKey(material.name) === materialKey
      )
      const matchingPurchase = stockPurchases.find(
        (purchase) => normalizeMaterialKey(purchase.materialName) === materialKey
      )

      const displayName = matchingMaterial?.name || matchingPurchase?.materialName || materialKey
      const unit = matchingMaterial?.unit || matchingPurchase?.unit || ''
      const currentQuantity = Number(matchingMaterial?.quantity || 0)

      const allPurchased = allPurchaseMap.get(materialKey) || 0
      const allUsed = allUsageMap.get(materialKey) || 0
      const baselineQuantity = Number((currentQuantity + allUsed - allPurchased).toFixed(2))

      const purchasedInFilter = filteredPurchaseMap.get(materialKey) || 0
      const usedInFilter = filteredUsageMap.get(materialKey) || 0
      const leftInFilter = Number((baselineQuantity + purchasedInFilter - usedInFilter).toFixed(2))

      return {
        material: displayName,
        unit,
        purchased: Number(purchasedInFilter.toFixed(2)),
        producedUsage: Number(usedInFilter.toFixed(2)),
        materialsLeft: leftInFilter,
      }
    })
  }, [materials, stockPurchases, allPurchaseMap, allUsageMap, filteredPurchaseMap, filteredUsageMap])

  const materialsLeftOptions = useMemo(
    () => materialBalanceRows.map((row) => row.material).sort((a, b) => a.localeCompare(b)),
    [materialBalanceRows]
  )

  const filteredStockPurchasesByItem = useMemo(() => {
    if (selectedStockItem === 'all') {
      return filteredStockPurchases
    }

    return filteredStockPurchases.filter(
      (purchase) => normalizeMaterialKey(purchase.materialName) === normalizeMaterialKey(selectedStockItem)
    )
  }, [filteredStockPurchases, selectedStockItem])

  const filteredProductionLogsByProduct = useMemo(() => {
    if (selectedProductionProduct === 'all') {
      return filteredProductionLogs
    }

    return filteredProductionLogs.filter(
      (log) => (log.productName || '').trim().toLowerCase() === selectedProductionProduct.trim().toLowerCase()
    )
  }, [filteredProductionLogs, selectedProductionProduct])

  const filteredMaterialBalanceRowsByStock = useMemo(() => {
    if (selectedMaterialsLeftStock === 'all') {
      return materialBalanceRows
    }

    return materialBalanceRows.filter(
      (row) => normalizeMaterialKey(row.material) === normalizeMaterialKey(selectedMaterialsLeftStock)
    )
  }, [materialBalanceRows, selectedMaterialsLeftStock])

  const paginatedStockPurchases = useMemo(
    () => paginateRows(filteredStockPurchasesByItem, stockPage, stockPageSize),
    [filteredStockPurchasesByItem, stockPage, stockPageSize]
  )

  const paginatedProductionLogs = useMemo(
    () => paginateRows(filteredProductionLogsByProduct, productionPage, productionPageSize),
    [filteredProductionLogsByProduct, productionPage, productionPageSize]
  )

  const paginatedMaterialsRows = useMemo(
    () => paginateRows(filteredMaterialBalanceRowsByStock, materialsPage, materialsPageSize),
    [filteredMaterialBalanceRowsByStock, materialsPage, materialsPageSize]
  )

  const resetPagination = () => {
    setStockPage(1)
    setProductionPage(1)
    setMaterialsPage(1)
  }

  const toggleSectionVisibility = (sectionKey) => {
    setVisibleSections((currentState) => ({
      ...currentState,
      [sectionKey]: !currentState[sectionKey],
    }))
  }

  const downloadRawMaterialsReport = () => {
    const selectedSections = [
      visibleSections.stockPurchases,
      visibleSections.productionMade,
      visibleSections.materialsLeft,
    ].filter(Boolean).length

    if (selectedSections === 0) {
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const selectedMonthLabel = monthOptions.find((item) => item.value === selectedMonth)?.label
    const periodParts = []

    if (selectedDay !== 'all') {
      periodParts.push(selectedDay)
    }

    if (selectedMonth !== 'all' && selectedMonthLabel) {
      periodParts.push(selectedMonthLabel)
    }

    if (selectedYear !== 'all') {
      periodParts.push(selectedYear)
    }

    const reportHeaderText = `Operationary Report as at ${
      periodParts.length > 0 ? periodParts.join(' ') : 'All Records'
    }`
    const trackerHeaderText = 'Production Tracker'

    if (rawMaterialsDownloadFormat === 'pdf') {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()

      pdf.setFontSize(18)
      pdf.text(trackerHeaderText, pageWidth / 2, 34, { align: 'center' })
      pdf.setFontSize(16)
      pdf.text(reportHeaderText, pageWidth / 2, 56, { align: 'center' })

      let currentY = 88

      const addSectionToPdf = (title, headers, rows, emptyMessage) => {
        if (currentY > 700) {
          pdf.addPage()
          currentY = 50
        }

        pdf.setFontSize(12)
        pdf.text(title, 40, currentY)

        autoTable(pdf, {
          startY: currentY + 8,
          head: [headers],
          body: rows.length > 0 ? rows : [[emptyMessage, ...headers.slice(1).map(() => '')]],
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [39, 174, 96] },
          margin: { left: 40, right: 40 },
        })

        currentY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 24 : currentY + 90
      }

      if (visibleSections.stockPurchases) {
        addSectionToPdf(
          'Stock Purchases',
          ['Date', 'Material', 'Quantity Purchased', 'Unit'],
          filteredStockPurchasesByItem.map((purchase) => [
            new Date(purchase.createdAt || purchase.purchaseDate).toLocaleDateString(),
            purchase.materialName,
            String(purchase.quantityPurchased),
            purchase.unit,
          ]),
          'No stock purchases found for selected filters.'
        )
      }

      if (visibleSections.productionMade) {
        addSectionToPdf(
          'Production Made',
          ['Date', 'Product', 'Quantity Produced'],
          filteredProductionLogsByProduct.map((log) => [
            new Date(log.createdAt).toLocaleDateString(),
            log.productName,
            String(log.quantity),
          ]),
          'No production records found for selected filters.'
        )
      }

      if (visibleSections.materialsLeft) {
        addSectionToPdf(
          'Materials Left',
          ['Material', 'Purchased', 'Used in Production', 'Materials Left', 'Unit'],
          filteredMaterialBalanceRowsByStock.map((row) => [
            row.material,
            String(row.purchased),
            String(row.producedUsage),
            String(row.materialsLeft),
            row.unit,
          ]),
          'No material balance data available.'
        )
      }

      pdf.save(`operations-report-${timestamp}.pdf`)
      return
    }

    const buildWordTable = (headers, rows) =>
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: headers.map(
              (headerValue) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: headerValue, bold: true })],
                    }),
                  ],
                })
            ),
          }),
          ...rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (value) =>
                    new TableCell({
                      children: [new Paragraph(String(value))],
                    })
                ),
              })
          ),
        ],
      })

    const purchaseRowsForWord = filteredStockPurchasesByItem.map((purchase) => [
      new Date(purchase.createdAt || purchase.purchaseDate).toLocaleDateString(),
      purchase.materialName,
      purchase.quantityPurchased,
      purchase.unit,
    ])

    const productionRowsForWord = filteredProductionLogsByProduct.map((log) => [
      new Date(log.createdAt).toLocaleDateString(),
      log.productName,
      log.quantity,
    ])

    const materialsRowsForWord = filteredMaterialBalanceRowsByStock.map((row) => [
      row.material,
      row.purchased,
      row.producedUsage,
      row.materialsLeft,
      row.unit,
    ])

    const docChildren = [
      new Paragraph({
        children: [new TextRun({ text: trackerHeaderText, bold: true, size: 34 })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph(''),
      new Paragraph({
        children: [new TextRun({ text: reportHeaderText, bold: true, size: 30 })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph(''),
    ]

    if (visibleSections.stockPurchases) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: 'Stock Purchases', bold: true })] }))
      docChildren.push(
        buildWordTable(
          ['Date', 'Material', 'Quantity Purchased', 'Unit'],
          purchaseRowsForWord.length > 0 ? purchaseRowsForWord : [['No stock purchases found for selected filters.', '', '', '']]
        )
      )
      docChildren.push(new Paragraph(''))
    }

    if (visibleSections.productionMade) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: 'Production Made', bold: true })] }))
      docChildren.push(
        buildWordTable(
          ['Date', 'Product', 'Quantity Produced'],
          productionRowsForWord.length > 0 ? productionRowsForWord : [['No production records found for selected filters.', '', '']]
        )
      )
      docChildren.push(new Paragraph(''))
    }

    if (visibleSections.materialsLeft) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: 'Materials Left', bold: true })] }))
      docChildren.push(
        buildWordTable(
          ['Material', 'Purchased', 'Used in Production', 'Materials Left', 'Unit'],
          materialsRowsForWord.length > 0 ? materialsRowsForWord : [['No material balance data available.', '', '', '', '']]
        )
      )
    }

    const doc = new Document({
      sections: [
        {
          children: docChildren,
        },
      ],
    })

    Packer.toBlob(doc).then((blob) => {
      const docUrl = URL.createObjectURL(blob)
      const docLink = document.createElement('a')
      docLink.href = docUrl
      docLink.download = `operations-report-${timestamp}.docx`
      docLink.click()
      URL.revokeObjectURL(docUrl)
    })
  }

  const clearFilters = () => {
    setSelectedYear('all')
    setSelectedMonth('all')
    setSelectedDay('all')
    setSelectedStockItem('all')
    setSelectedProductionProduct('all')
    setSelectedMaterialsLeftStock('all')
    resetPagination()
  }

  return (
    <div className="page-grid">
      <section className="page-card report-filter-card">
        <div className="report-toolbar">
          <div className="report-filter-head">
            <h1 className="report-filter-title">Reports</h1>
            <p className="muted-text report-filter-subtitle">
              Filter by day, month, and year to view purchases, production, and materials left.
            </p>
          </div>

          <div className="report-download-controls">
            <select
              value={rawMaterialsDownloadFormat}
              onChange={(event) => setRawMaterialsDownloadFormat(event.target.value)}
              aria-label="Select report format"
            >
              <option value="pdf">PDF</option>
              <option value="word">Word (.docx)</option>
            </select>
            <button type="button" className="button-secondary" onClick={downloadRawMaterialsReport}>
              Download Selected
            </button>
          </div>
        </div>

        <div className="inline-actions compact-actions report-filter-controls">
          <div className="report-section-toggle-row">
            <label>
              <input
                type="checkbox"
                checked={visibleSections.stockPurchases}
                onChange={() => toggleSectionVisibility('stockPurchases')}
              />
              Stock Purchases
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleSections.productionMade}
                onChange={() => toggleSectionVisibility('productionMade')}
              />
              Production Made
            </label>
            <label>
              <input
                type="checkbox"
                checked={visibleSections.materialsLeft}
                onChange={() => toggleSectionVisibility('materialsLeft')}
              />
              Materials Left
            </label>
          </div>
        </div>

        <div className="inline-actions compact-actions report-filter-controls">
          <select
            value={selectedYear}
            onChange={(event) => {
              setSelectedYear(event.target.value)
              resetPagination()
            }}
          >
            <option value="all">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value)
              resetPagination()
            }}
          >
            <option value="all">All Months</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            value={selectedDay}
            onChange={(event) => {
              setSelectedDay(event.target.value)
              resetPagination()
            }}
          >
            <option value="all">All Days</option>
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <button type="button" className="button-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </section>

      {visibleSections.stockPurchases && (
        <section className="page-card">
          <div className="report-section-head">
            <h2>Stock Purchases Report</h2>
            <div className="report-pagination-controls">
              <label>
                Material
                <select
                  value={selectedStockItem}
                  onChange={(event) => {
                    setSelectedStockItem(event.target.value)
                    setStockPage(1)
                  }}
                >
                  <option value="all">All Materials</option>
                  {stockItemOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Items per page
                <select
                  value={stockPageSize}
                  onChange={(event) => {
                    setStockPageSize(Number(event.target.value))
                    setStockPage(1)
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setStockPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={paginatedStockPurchases.currentPage === 1}
              >
                Prev
              </button>
              <span>
                {paginatedStockPurchases.currentPage} / {paginatedStockPurchases.totalPages}
              </span>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setStockPage((currentPage) =>
                    Math.min(paginatedStockPurchases.totalPages, currentPage + 1)
                  )
                }
                disabled={paginatedStockPurchases.currentPage >= paginatedStockPurchases.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Material</th>
                <th>Quantity Purchased</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {filteredStockPurchasesByItem.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-state-cell">
                    No stock purchases found for selected filters.
                  </td>
                </tr>
              ) : (
                paginatedStockPurchases.rows.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>{new Date(purchase.createdAt || purchase.purchaseDate).toLocaleDateString()}</td>
                    <td>{purchase.materialName}</td>
                    <td>{purchase.quantityPurchased}</td>
                    <td>{purchase.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}

      {visibleSections.productionMade && (
        <section className="page-card">
          <div className="report-section-head">
            <h2>Production Made Report</h2>
            <div className="report-pagination-controls">
              <label>
                Product
                <select
                  value={selectedProductionProduct}
                  onChange={(event) => {
                    setSelectedProductionProduct(event.target.value)
                    setProductionPage(1)
                  }}
                >
                  <option value="all">All Products</option>
                  {productionProductOptions.map((productName) => (
                    <option key={productName} value={productName}>
                      {productName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Items per page
                <select
                  value={productionPageSize}
                  onChange={(event) => {
                    setProductionPageSize(Number(event.target.value))
                    setProductionPage(1)
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setProductionPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={paginatedProductionLogs.currentPage === 1}
              >
                Prev
              </button>
              <span>
                {paginatedProductionLogs.currentPage} / {paginatedProductionLogs.totalPages}
              </span>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setProductionPage((currentPage) =>
                    Math.min(paginatedProductionLogs.totalPages, currentPage + 1)
                  )
                }
                disabled={paginatedProductionLogs.currentPage >= paginatedProductionLogs.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Quantity Produced</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductionLogsByProduct.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-state-cell">
                    No production records found for selected filters.
                  </td>
                </tr>
              ) : (
                paginatedProductionLogs.rows.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleDateString()}</td>
                    <td>{log.productName}</td>
                    <td>{log.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}

      {visibleSections.materialsLeft && (
        <section className="page-card">
          <div className="report-section-head">
            <h2>Materials Left Report</h2>
            <div className="report-pagination-controls">
              <label>
                Stock
                <select
                  value={selectedMaterialsLeftStock}
                  onChange={(event) => {
                    setSelectedMaterialsLeftStock(event.target.value)
                    setMaterialsPage(1)
                  }}
                >
                  <option value="all">All Stocks</option>
                  {materialsLeftOptions.map((stockName) => (
                    <option key={stockName} value={stockName}>
                      {stockName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Items per page
                <select
                  value={materialsPageSize}
                  onChange={(event) => {
                    setMaterialsPageSize(Number(event.target.value))
                    setMaterialsPage(1)
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setMaterialsPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={paginatedMaterialsRows.currentPage === 1}
              >
                Prev
              </button>
              <span>
                {paginatedMaterialsRows.currentPage} / {paginatedMaterialsRows.totalPages}
              </span>
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  setMaterialsPage((currentPage) =>
                    Math.min(paginatedMaterialsRows.totalPages, currentPage + 1)
                  )
                }
                disabled={paginatedMaterialsRows.currentPage >= paginatedMaterialsRows.totalPages}
              >
                Next
              </button>
            </div>
          </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Purchased</th>
                <th>Used in Production</th>
                <th>Materials Left</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterialBalanceRowsByStock.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state-cell">
                    No material balance data available.
                  </td>
                </tr>
              ) : (
                paginatedMaterialsRows.rows.map((row) => (
                  <tr key={row.material}>
                    <td>{row.material}</td>
                    <td>{row.purchased}</td>
                    <td>{row.producedUsage}</td>
                    <td>{row.materialsLeft}</td>
                    <td>{row.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}
    </div>
  )
}

export default Report
