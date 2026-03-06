import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'

const RecordProduction = () => {
  const { products, productionLogs, recordProduction } = useAppContext()
  const [formData, setFormData] = useState({ productId: '', quantity: '' })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [latestSummary, setLatestSummary] = useState(null)

  const handleChange = (event) => {
    setFormData((prevData) => ({
      ...prevData,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await recordProduction(formData)
    setFeedbackMessage(result.message)
    if (result.ok) {
      setFormData({ productId: '', quantity: '' })
      setLatestSummary(result.summary || null)
    } else {
      setLatestSummary(null)
    }
  }

  return (
    <div className="page-grid">
      <section className="page-card">
        <h1>Record Production</h1>
        <p className="muted-text">Log produced quantity and automatically deduct raw materials.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label htmlFor="productId">Product</label>
          <select id="productId" name="productId" value={formData.productId} onChange={handleChange}>
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.productName}
              </option>
            ))}
          </select>

          <label htmlFor="quantity">Produced Quantity</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="50"
          />

          {feedbackMessage && <p className="info-text">{feedbackMessage}</p>}
          <button type="submit">Record Production</button>
        </form>

        {latestSummary && (
          <div className="production-summary">
            <h2>Materials Left After This Production</h2>
            <p className="muted-text">
              {latestSummary.producedQuantity} unit(s) of {latestSummary.productName}
            </p>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Used</th>
                    <th>Left</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSummary.materials.map((item) => (
                    <tr key={`${item.materialName}-${item.unit}`}>
                      <td>{item.materialName}</td>
                      <td>{item.used}</td>
                      <td>{item.left}</td>
                      <td>{item.unit}</td>
                      <td>
                        {item.isLowStock ? (
                          <span className="error-text">Low Stock</span>
                        ) : (
                          <span className="success-text">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="page-card">
        <h2>Recent Production Logs</h2>
        {productionLogs.length === 0 ? (
          <p className="muted-text">No production records yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {productionLogs.slice(0, 8).map((log) => (
                  <tr key={log.id}>
                    <td>{log.productName}</td>
                    <td>{log.quantity}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
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

export default RecordProduction