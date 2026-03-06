import React from 'react'
import { useAppContext } from '../context/AppContext'

const Dashboard = () => {
  const {
    materials,
    finishedGoods,
    lowStockMaterials,
    totalRawMaterials,
    totalFinishedGoods,
    totalProductionRuns,
  } = useAppContext()

  return (
    <div className="page-grid">
      <section className="summary-grid">
        <article className="metric-card">
          <h3>Raw Materials</h3>
          <p>{totalRawMaterials}</p>
        </article>
        <article className="metric-card">
          <h3>Finished Goods</h3>
          <p>{totalFinishedGoods}</p>
        </article>
        <article className="metric-card">
          <h3>Production Runs</h3>
          <p>{totalProductionRuns}</p>
        </article>
      </section>

      <section className="page-card">
        <h2>Low Stock Alerts</h2>
        {lowStockMaterials.length === 0 ? (
          <p className="success-text">All materials are above threshold.</p>
        ) : (
          <ul className="alert-list">
            {lowStockMaterials.map((material) => (
              <li key={material.id}>
                <strong>{material.name}</strong> is low: {material.quantity} {material.unit} left
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page-card">
        <h2>Stock Snapshot</h2>
        {materials.length === 0 ? (
          <p className="muted-text">No materials in stock.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {materials.slice(0, 6).map((material) => (
                  <tr key={material.id}>
                    <td>{material.name}</td>
                    <td>{material.quantity}</td>
                    <td>{material.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-card">
        <h2>Finished Goods</h2>
        {finishedGoods.length === 0 ? (
          <p className="muted-text">No finished goods recorded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {finishedGoods.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard