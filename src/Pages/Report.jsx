import React, { useMemo } from 'react'
import { useAppContext } from '../context/AppContext'

const Report = () => {
  const { materials, products, finishedGoods, productionLogs, lowStockMaterials } = useAppContext()

  const usedQuantityByMaterial = useMemo(() => {
    const usageMap = new Map()

    productionLogs.forEach((log) => {
      if (Array.isArray(log.materialSummary) && log.materialSummary.length > 0) {
        log.materialSummary.forEach((item) => {
          const currentUsed = usageMap.get(item.materialName) || 0
          usageMap.set(item.materialName, Number((currentUsed + Number(item.used || 0)).toFixed(2)))
        })
        return
      }

      const matchingProduct = products.find((product) => product.id === log.productId)
      if (!matchingProduct) {
        return
      }

      matchingProduct.ingredients.forEach((ingredient) => {
        const used = Number(ingredient.amountPerUnit) * Number(log.quantity)
        const currentUsed = usageMap.get(ingredient.materialName) || 0
        usageMap.set(ingredient.materialName, Number((currentUsed + used).toFixed(2)))
      })
    })

    return usageMap
  }, [productionLogs, products])

  return (
    <div className="page-grid">
      <section className="page-card">
        <h1>Reports</h1>
        <p className="muted-text">
          View current stock, finished goods, production history, and low stock warning list.
        </p>
      </section>

      <section className="page-card">
        <h2>Low Stock List</h2>
        {lowStockMaterials.length === 0 ? (
          <p className="success-text">No low stock warning at the moment.</p>
        ) : (
          <ul className="alert-list">
            {lowStockMaterials.map((material) => (
              <li key={material.id}>
                {material.name} - {material.quantity} {material.unit} remaining
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page-card">
        <h2>Raw Materials Report</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Initial Quantity</th>
                <th>Unit</th>
                <th>Quantity Used</th>
                <th>Quantity Remaining</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const usedQuantity = usedQuantityByMaterial.get(material.name) || 0
                const remainingQuantity = Number(material.quantity)
                const initialQuantity = Number((usedQuantity + remainingQuantity).toFixed(2))

                return (
                  <tr key={material.id}>
                    <td>{material.name}</td>
                    <td>{initialQuantity}</td>
                    <td>{material.unit}</td>
                    <td>{Number(usedQuantity.toFixed(2))}</td>
                    <td>{remainingQuantity}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-card">
        <h2>Finished Goods Report</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Total Produced</th>
              </tr>
            </thead>
            <tbody>
              {finishedGoods.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-state-cell">
                    No finished goods available.
                  </td>
                </tr>
              ) : (
                finishedGoods.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="page-card">
        <h2>Production History</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {productionLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-state-cell">
                    No production activity logged yet.
                  </td>
                </tr>
              ) : (
                productionLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.productName}</td>
                    <td>{log.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Report