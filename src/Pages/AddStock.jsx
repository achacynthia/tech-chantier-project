import React, { useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const emptyMaterialForm = {
  name: '',
  quantity: '',
  unit: '',
  lowStockThreshold: '',
}

const AddStock = () => {
  const { materials, products, addMaterial, updateMaterial, deleteMaterial, configureProduct, deleteProduct } = useAppContext()

  const [materialForm, setMaterialForm] = useState(emptyMaterialForm)
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productName, setProductName] = useState('')
  const [recipeRows, setRecipeRows] = useState([{ materialName: '', amountPerUnit: '' }])
  const [materialMessage, setMaterialMessage] = useState('')
  const [recipeMessage, setRecipeMessage] = useState('')

  const materialOptions = useMemo(() => materials, [materials])

  const handleMaterialChange = (event) => {
    setMaterialForm((prevForm) => ({
      ...prevForm,
      [event.target.name]: event.target.value,
    }))
  }

  const submitMaterial = async (event) => {
    event.preventDefault()
    const result = editingMaterialId
      ? await updateMaterial(editingMaterialId, materialForm)
      : await addMaterial(materialForm)
    setMaterialMessage(result.message)

    if (result.ok) {
      setEditingMaterialId(null)
      setMaterialForm(emptyMaterialForm)
    }
  }

  const editMaterial = (material) => {
    setEditingMaterialId(material.id)
    setMaterialForm({
      name: material.name,
      quantity: material.quantity,
      unit: material.unit,
      lowStockThreshold: material.lowStockThreshold,
    })
    setMaterialMessage(`Editing ${material.name}. Update and save to apply changes.`)
  }

  const removeMaterial = async (materialId) => {
    if (editingMaterialId === materialId) {
      setEditingMaterialId(null)
      setMaterialForm(emptyMaterialForm)
    }

    const result = await deleteMaterial(materialId)
    setMaterialMessage(result.message)
  }

  const cancelMaterialEdit = () => {
    setEditingMaterialId(null)
    setMaterialForm(emptyMaterialForm)
    setMaterialMessage('')
  }

  const updateRecipeRow = (index, field, value) => {
    setRecipeRows((prevRows) =>
      prevRows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    )
  }

  const addRecipeRow = () => {
    setRecipeRows((prevRows) => [...prevRows, { materialName: '', amountPerUnit: '' }])
  }

  const removeRecipeRow = (index) => {
    setRecipeRows((prevRows) => prevRows.filter((_, rowIndex) => rowIndex !== index))
  }

  const submitRecipe = async (event) => {
    event.preventDefault()
    const result = await configureProduct({
      productId: editingProductId,
      productName,
      ingredients: recipeRows,
    })
    setRecipeMessage(result.message)
    if (result.ok) {
      setEditingProductId(null)
      setProductName('')
      setRecipeRows([{ materialName: '', amountPerUnit: '' }])
    }
  }

  const editRecipe = (product) => {
    setEditingProductId(product.id)
    setProductName(product.productName)
    setRecipeRows(
      product.ingredients.map((ingredient) => ({
        materialName: ingredient.materialName,
        amountPerUnit: ingredient.amountPerUnit,
      }))
    )
    setRecipeMessage(`Editing ${product.productName}. Update and save to apply changes.`)
  }

  const removeRecipe = async (productId) => {
    if (editingProductId === productId) {
      setEditingProductId(null)
      setProductName('')
      setRecipeRows([{ materialName: '', amountPerUnit: '' }])
    }

    const result = await deleteProduct(productId)
    setRecipeMessage(result.message)
  }

  const cancelEdit = () => {
    setEditingProductId(null)
    setProductName('')
    setRecipeRows([{ materialName: '', amountPerUnit: '' }])
    setRecipeMessage('')
  }

  return (
    <div className="page-grid two-column-grid">
      <section className="page-card">
        <h1>{editingMaterialId ? 'Edit Raw Material' : 'Add Raw Material'}</h1>
        <p className="muted-text">Add purchased stock or update existing material quantity.</p>

        <form className="form-grid" onSubmit={submitMaterial}>
          <label htmlFor="name">Material Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={materialForm.name}
            onChange={handleMaterialChange}
            placeholder="e.g. Flour"
          />

          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            value={materialForm.quantity}
            onChange={handleMaterialChange}
            placeholder="e.g. 50"
          />

          <label htmlFor="unit">Unit</label>
          <input
            id="unit"
            name="unit"
            type="text"
            value={materialForm.unit}
            onChange={handleMaterialChange}
            placeholder="e.g. kg"
          />

          <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
          <input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min="0"
            step="0.01"
            value={materialForm.lowStockThreshold}
            onChange={handleMaterialChange}
            placeholder="e.g. 10"
          />

          {materialMessage && <p className="info-text">{materialMessage}</p>}
          <div className="inline-actions">
            <button type="submit">{editingMaterialId ? 'Update Material' : 'Save Stock'}</button>
            {editingMaterialId && (
              <button type="button" className="button-secondary" onClick={cancelMaterialEdit}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="page-card">
        <h2>Configure Production Unit</h2>
        <p className="muted-text">Define the materials needed to produce one unit.</p>

        <form className="form-grid" onSubmit={submitRecipe}>
          <label htmlFor="productName">Product Name</label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Bread Loaf"
          />

          {recipeRows.map((recipeRow, index) => (
            <div className="recipe-row" key={`recipe-row-${index}`}>
              <select
                value={recipeRow.materialName}
                onChange={(event) => updateRecipeRow(index, 'materialName', event.target.value)}
              >
                <option value="">Select material</option>
                {materialOptions.map((material) => (
                  <option key={material.id} value={material.name}>
                    {material.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={recipeRow.amountPerUnit}
                onChange={(event) => updateRecipeRow(index, 'amountPerUnit', event.target.value)}
                placeholder="Amount per unit"
              />

              <button type="button" className="button-secondary" onClick={() => removeRecipeRow(index)}>
                Remove
              </button>
            </div>
          ))}

          <div className="inline-actions">
            <button type="button" className="button-secondary" onClick={addRecipeRow}>
              Add Material Row
            </button>
            <button type="submit">{editingProductId ? 'Update Recipe' : 'Save Recipe'}</button>
            {editingProductId && (
              <button type="button" className="button-secondary" onClick={cancelEdit}>
                Cancel Edit
              </button>
            )}
          </div>
          {recipeMessage && <p className="info-text">{recipeMessage}</p>}
        </form>
      </section>

      <section className="page-card full-width-card">
        <h2>Current Raw Materials</h2>
        {materials.length === 0 ? (
          <p className="muted-text">No raw materials added yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Low Stock Threshold</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.name}</td>
                    <td>{material.quantity}</td>
                    <td>{material.unit}</td>
                    <td>{material.lowStockThreshold}</td>
                    <td>
                      <div className="inline-actions compact-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => editMaterial(material)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => removeMaterial(material.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-card full-width-card">
        <h2>Saved Recipes</h2>
        <p className="muted-text">Each card shows one product and its ingredients per unit.</p>

        {products.length === 0 ? (
          <p className="muted-text">No recipes saved yet.</p>
        ) : (
          <div className="recipe-gallery-grid">
            {products.map((product) => (
              <article className="recipe-card" key={product.id}>
                <div className="recipe-card-header">
                  <h3>{product.productName}</h3>
                  <div className="inline-actions compact-actions">
                    <button type="button" className="button-secondary" onClick={() => editRecipe(product)}>
                      Edit
                    </button>
                    <button type="button" className="button-danger" onClick={() => removeRecipe(product.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Amount / Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.ingredients.map((ingredient, index) => (
                        <tr key={`${product.id}-ingredient-${index}`}>
                          <td>{ingredient.materialName}</td>
                          <td>{ingredient.amountPerUnit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AddStock