import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const AppContext = createContext(null)

const LOW_STOCK_THRESHOLD = 10

const initialMaterials = [
  { id: 1, name: 'Flour (kg)', quantity: 120, unit: 'kg', lowStockThreshold: LOW_STOCK_THRESHOLD },
  { id: 2, name: 'Yeast (g)', quantity: 1500, unit: 'g', lowStockThreshold: LOW_STOCK_THRESHOLD },
  { id: 3, name: 'Sugar (kg)', quantity: 40, unit: 'kg', lowStockThreshold: LOW_STOCK_THRESHOLD },
]

const initialProducts = [
  {
    id: 1,
    productName: 'Bread Loaf',
    ingredients: [
      { materialName: 'Flour (kg)', amountPerUnit: 0.5 },
      { materialName: 'Yeast (g)', amountPerUnit: 5 },
      { materialName: 'Sugar (kg)', amountPerUnit: 0.03 },
    ],
  },
]

const mapMaterialRecord = (record) => ({
  id: Number(record.id),
  name: record.name,
  quantity: Number(record.quantity),
  unit: record.unit,
  lowStockThreshold: Number(record.low_stock_threshold),
})

const mapProductRecord = (record) => ({
  id: Number(record.id),
  productName: record.product_name,
  ingredients: (record.product_ingredients || []).map((ingredient) => ({
    materialName: ingredient.material_name,
    amountPerUnit: Number(ingredient.amount_per_unit),
  })),
})

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [materials, setMaterials] = useState(initialMaterials)
  const [products, setProducts] = useState(initialProducts)
  const [productionLogs, setProductionLogs] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isSupabaseConfigured) {
        setIsBootstrapping(false)
        return
      }

      const loadFromSupabase = async () => {
        const [materialsResult, productsResult, logsResult, finishedGoodsResult] = await Promise.all([
          supabase.from('materials').select('*').order('id', { ascending: true }),
          supabase
            .from('products')
            .select('id, product_name, product_ingredients(material_name, amount_per_unit)')
            .order('id', { ascending: true }),
          supabase.from('production_logs').select('*').order('created_at', { ascending: false }),
          supabase.from('finished_goods').select('*').order('product_name', { ascending: true }),
        ])

        if (materialsResult.error) throw materialsResult.error
        if (productsResult.error) throw productsResult.error
        if (logsResult.error) throw logsResult.error
        if (finishedGoodsResult.error) throw finishedGoodsResult.error

        return {
          materialsData: materialsResult.data || [],
          productsData: productsResult.data || [],
          logsData: logsResult.data || [],
          finishedGoodsData: finishedGoodsResult.data || [],
        }
      }

      const seedDefaultData = async () => {
        const { error: materialsSeedError } = await supabase.from('materials').upsert(
          initialMaterials.map((material) => ({
            name: material.name,
            quantity: material.quantity,
            unit: material.unit,
            low_stock_threshold: material.lowStockThreshold,
          })),
          { onConflict: 'name' }
        )

        if (materialsSeedError) throw materialsSeedError

        const { data: existingBread } = await supabase
          .from('products')
          .select('id')
          .eq('product_name', initialProducts[0].productName)
          .maybeSingle()

        let breadId = existingBread?.id

        if (!breadId) {
          const { data: insertedProduct, error: insertProductError } = await supabase
            .from('products')
            .insert([{ product_name: initialProducts[0].productName }])
            .select('id')
            .single()

          if (insertProductError) throw insertProductError
          breadId = insertedProduct.id
        }

        if (breadId) {
          await supabase.from('product_ingredients').delete().eq('product_id', breadId)
          const { error: ingredientSeedError } = await supabase.from('product_ingredients').insert(
            initialProducts[0].ingredients.map((ingredient) => ({
              product_id: breadId,
              material_name: ingredient.materialName,
              amount_per_unit: ingredient.amountPerUnit,
            }))
          )

          if (ingredientSeedError) throw ingredientSeedError
        }
      }

      try {
        let allData = await loadFromSupabase()

        if (allData.materialsData.length === 0 && allData.productsData.length === 0) {
          await seedDefaultData()
          allData = await loadFromSupabase()
        }

        setMaterials(allData.materialsData.map(mapMaterialRecord))
        setProducts(allData.productsData.map(mapProductRecord))
        setFinishedGoods(
          allData.finishedGoodsData.map((good) => ({
            productId: Number(good.product_id),
            productName: good.product_name,
            quantity: Number(good.quantity),
          }))
        )
        setProductionLogs(
          allData.logsData.map((log) => ({
            id: Number(log.id),
            productId: log.product_id ? Number(log.product_id) : null,
            productName: log.product_name,
            quantity: Number(log.quantity),
            materialSummary: Array.isArray(log.material_summary) ? log.material_summary : [],
            createdAt: log.created_at,
          }))
        )
      } catch (error) {
        console.error('Supabase bootstrap failed:', error)
      } finally {
        setIsBootstrapping(false)
      }
    }

    fetchAllData()
  }, [])

  const login = async ({ name, email }) => {
    const normalizedName = name?.trim()
    const normalizedEmail = email?.trim().toLowerCase()

    if (!normalizedName || !normalizedEmail) {
      return { ok: false, message: 'Please enter both name and email.' }
    }

    if (!isSupabaseConfigured) {
      setCurrentUser({ id: Date.now(), name: normalizedName, email: normalizedEmail })
      setIsAuthenticated(true)
      return { ok: true, message: `Welcome, ${normalizedName}.` }
    }

    const { data: existingUser, error: lookupError } = await supabase
      .from('app_users')
      .select('id, name, email')
      .eq('name', normalizedName)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError) {
      return { ok: false, message: 'Unable to login right now. Please try again.' }
    }

    let userRecord = existingUser

    if (!userRecord) {
      const { data: insertedUser, error: insertError } = await supabase
        .from('app_users')
        .insert([{ name: normalizedName, email: normalizedEmail }])
        .select('id, name, email')
        .single()

      if (insertError) {
        return { ok: false, message: 'Unable to create user profile for login.' }
      }

      userRecord = insertedUser
    }

    setCurrentUser({
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
    })
    setIsAuthenticated(true)

    return { ok: true, message: `Welcome, ${normalizedName}.` }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  const addMaterial = async (materialPayload) => {
    const name = materialPayload.name.trim()
    if (!name) {
      return { ok: false, message: 'Material name is required.' }
    }

    const quantity = Number(materialPayload.quantity)
    const lowStockThreshold = Number(materialPayload.lowStockThreshold || LOW_STOCK_THRESHOLD)

    if (Number.isNaN(quantity) || quantity <= 0) {
      return { ok: false, message: 'Quantity must be greater than zero.' }
    }

    const existingMaterial = materials.find(
      (material) => material.name.toLowerCase() === name.toLowerCase()
    )

    if (existingMaterial) {
      const updatedQuantity = Number((existingMaterial.quantity + quantity).toFixed(2))

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('materials')
          .update({ quantity: updatedQuantity })
          .eq('id', existingMaterial.id)

        if (error) {
          return { ok: false, message: 'Could not update material in backend.' }
        }
      }

      setMaterials((prevMaterials) =>
        prevMaterials.map((material) =>
          material.id === existingMaterial.id
            ? { ...material, quantity: updatedQuantity }
            : material
        )
      )
      return { ok: true, message: `${name} updated successfully.` }
    }

    const unit = materialPayload.unit.trim() || 'unit'
    const normalizedThreshold = Number.isNaN(lowStockThreshold)
      ? LOW_STOCK_THRESHOLD
      : lowStockThreshold

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('materials')
        .insert([
          {
            name,
            quantity,
            unit,
            low_stock_threshold: normalizedThreshold,
          },
        ])
        .select('*')
        .single()

      if (error) {
        return { ok: false, message: 'Could not add material to backend.' }
      }

      setMaterials((prevMaterials) => [...prevMaterials, mapMaterialRecord(data)])
      return { ok: true, message: `${name} added to stock.` }
    }

    setMaterials((prevMaterials) => [
      ...prevMaterials,
      {
        id: Date.now(),
        name,
        quantity,
        unit,
        lowStockThreshold: normalizedThreshold,
      },
    ])
    return { ok: true, message: `${name} added to stock.` }
  }

  const updateMaterial = async (materialId, materialPayload) => {
    const parsedMaterialId = Number(materialId)
    if (Number.isNaN(parsedMaterialId)) {
      return { ok: false, message: 'Invalid material selected.' }
    }

    const materialToUpdate = materials.find((material) => material.id === parsedMaterialId)
    if (!materialToUpdate) {
      return { ok: false, message: 'Material not found.' }
    }

    const name = materialPayload.name.trim()
    const unit = materialPayload.unit.trim() || 'unit'
    const quantity = Number(materialPayload.quantity)
    const lowStockThreshold = Number(materialPayload.lowStockThreshold)

    if (!name) {
      return { ok: false, message: 'Material name is required.' }
    }

    if (Number.isNaN(quantity) || quantity < 0) {
      return { ok: false, message: 'Quantity must be zero or greater.' }
    }

    if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      return { ok: false, message: 'Low stock threshold must be zero or greater.' }
    }

    const duplicateName = materials.find(
      (material) =>
        material.id !== parsedMaterialId && material.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicateName) {
      return { ok: false, message: 'Another material already uses this name.' }
    }

    if (isSupabaseConfigured) {
      const { error: updateError } = await supabase
        .from('materials')
        .update({
          name,
          unit,
          quantity,
          low_stock_threshold: lowStockThreshold,
        })
        .eq('id', parsedMaterialId)

      if (updateError) {
        return { ok: false, message: 'Failed to update material in backend.' }
      }

      if (materialToUpdate.name.toLowerCase() !== name.toLowerCase()) {
        const { error: ingredientRenameError } = await supabase
          .from('product_ingredients')
          .update({ material_name: name })
          .eq('material_name', materialToUpdate.name)

        if (ingredientRenameError) {
          return { ok: false, message: 'Material updated, but recipe links could not be renamed.' }
        }
      }
    }

    setMaterials((prevMaterials) =>
      prevMaterials.map((material) =>
        material.id === parsedMaterialId
          ? {
              ...material,
              name,
              unit,
              quantity,
              lowStockThreshold,
            }
          : material
      )
    )

    if (materialToUpdate.name.toLowerCase() !== name.toLowerCase()) {
      setProducts((prevProducts) =>
        prevProducts.map((product) => ({
          ...product,
          ingredients: product.ingredients.map((ingredient) =>
            ingredient.materialName.toLowerCase() === materialToUpdate.name.toLowerCase()
              ? { ...ingredient, materialName: name }
              : ingredient
          ),
        }))
      )
    }

    return { ok: true, message: `${name} updated successfully.` }
  }

  const deleteMaterial = async (materialId) => {
    const parsedMaterialId = Number(materialId)
    if (Number.isNaN(parsedMaterialId)) {
      return { ok: false, message: 'Invalid material selected.' }
    }

    const materialToDelete = materials.find((material) => material.id === parsedMaterialId)
    if (!materialToDelete) {
      return { ok: false, message: 'Material not found.' }
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('materials').delete().eq('id', parsedMaterialId)
      if (error) {
        return { ok: false, message: 'Could not delete material from backend.' }
      }
    }

    setMaterials((prevMaterials) => prevMaterials.filter((material) => material.id !== parsedMaterialId))

    return { ok: true, message: `${materialToDelete.name} deleted.` }
  }

  const configureProduct = async ({ productId, productName, ingredients }) => {
    const name = productName.trim()
    if (!name) {
      return { ok: false, message: 'Product name is required.' }
    }

    const validIngredients = ingredients
      .map((ingredient) => ({
        materialName: ingredient.materialName?.trim(),
        amountPerUnit: Number(ingredient.amountPerUnit),
      }))
      .filter(
        (ingredient) =>
          Boolean(ingredient.materialName) &&
          !Number.isNaN(ingredient.amountPerUnit) &&
          ingredient.amountPerUnit > 0
      )

    if (validIngredients.length === 0) {
      return { ok: false, message: 'Add at least one valid recipe entry.' }
    }

    const duplicatedMaterial = validIngredients.some(
      (entry, index) =>
        validIngredients.findIndex(
          (row) => row.materialName.toLowerCase() === entry.materialName.toLowerCase()
        ) !== index
    )

    if (duplicatedMaterial) {
      return { ok: false, message: 'A material can only appear once in the same recipe.' }
    }

    const parsedProductId = Number(productId)
    const existingProduct = products.find((product) =>
      Number.isNaN(parsedProductId)
        ? product.productName.toLowerCase() === name.toLowerCase()
        : product.id === parsedProductId
    )

    if (existingProduct) {
      if (isSupabaseConfigured) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ product_name: name })
          .eq('id', existingProduct.id)

        if (updateError) {
          return { ok: false, message: 'Could not update product in backend.' }
        }

        const { error: clearError } = await supabase
          .from('product_ingredients')
          .delete()
          .eq('product_id', existingProduct.id)

        if (clearError) {
          return { ok: false, message: 'Could not clear old recipe rows in backend.' }
        }

        const { error: insertIngredientsError } = await supabase.from('product_ingredients').insert(
          validIngredients.map((ingredient) => ({
            product_id: existingProduct.id,
            material_name: ingredient.materialName,
            amount_per_unit: ingredient.amountPerUnit,
          }))
        )

        if (insertIngredientsError) {
          return { ok: false, message: 'Could not save updated recipe rows in backend.' }
        }
      }

      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === existingProduct.id
            ? { ...product, productName: name, ingredients: validIngredients }
            : product
        )
      )
      return { ok: true, message: `${name} recipe updated.` }
    }

    if (isSupabaseConfigured) {
      const { data: insertedProduct, error: insertProductError } = await supabase
        .from('products')
        .insert([{ product_name: name }])
        .select('id, product_name')
        .single()

      if (insertProductError) {
        return { ok: false, message: 'Could not create product in backend.' }
      }

      const { error: insertIngredientsError } = await supabase.from('product_ingredients').insert(
        validIngredients.map((ingredient) => ({
          product_id: insertedProduct.id,
          material_name: ingredient.materialName,
          amount_per_unit: ingredient.amountPerUnit,
        }))
      )

      if (insertIngredientsError) {
        return { ok: false, message: 'Could not save recipe rows in backend.' }
      }

      setProducts((prevProducts) => [
        ...prevProducts,
        {
          id: Number(insertedProduct.id),
          productName: insertedProduct.product_name,
          ingredients: validIngredients,
        },
      ])

      return { ok: true, message: `${name} recipe configured.` }
    }

    setProducts((prevProducts) => [
      ...prevProducts,
      {
        id: Date.now(),
        productName: name,
        ingredients: validIngredients,
      },
    ])
    return { ok: true, message: `${name} recipe configured.` }
  }

  const deleteProduct = async (productId) => {
    const parsedProductId = Number(productId)
    if (Number.isNaN(parsedProductId)) {
      return { ok: false, message: 'Invalid product selected.' }
    }

    const productToDelete = products.find((product) => product.id === parsedProductId)
    if (!productToDelete) {
      return { ok: false, message: 'Product not found.' }
    }

    if (isSupabaseConfigured) {
      const { error: deleteFinishedGoodError } = await supabase
        .from('finished_goods')
        .delete()
        .eq('product_id', parsedProductId)

      if (deleteFinishedGoodError) {
        return { ok: false, message: 'Could not remove product stock summary.' }
      }

      const { error: deleteProductError } = await supabase
        .from('products')
        .delete()
        .eq('id', parsedProductId)

      if (deleteProductError) {
        return { ok: false, message: 'Could not delete product from backend.' }
      }
    }

    setProducts((prevProducts) => prevProducts.filter((product) => product.id !== parsedProductId))
    setFinishedGoods((prevGoods) => prevGoods.filter((good) => good.productId !== parsedProductId))

    return { ok: true, message: `${productToDelete.productName} deleted.` }
  }

  const recordProduction = async ({ productId, quantity }) => {
    const parsedProductId = Number(productId)
    const parsedQuantity = Number(quantity)

    if (Number.isNaN(parsedProductId)) {
      return { ok: false, message: 'Select a product.' }
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return { ok: false, message: 'Production quantity must be greater than zero.' }
    }

    const selectedProduct = products.find((product) => product.id === parsedProductId)
    if (!selectedProduct) {
      return { ok: false, message: 'Selected product was not found.' }
    }

    const productionMaterialSummary = []

    for (const ingredient of selectedProduct.ingredients) {
      const material = materials.find(
        (rawMaterial) => rawMaterial.name.toLowerCase() === ingredient.materialName.toLowerCase()
      )
      if (!material) {
        return { ok: false, message: `Required material ${ingredient.materialName} is missing.` }
      }

      const requiredAmount = ingredient.amountPerUnit * parsedQuantity
      if (material.quantity < requiredAmount) {
        return {
          ok: false,
          message: `Not enough ${material.name}. Required ${requiredAmount} ${material.unit}, available ${material.quantity} ${material.unit}.`,
        }
      }

      const leftQuantity = Number((material.quantity - requiredAmount).toFixed(2))
      productionMaterialSummary.push({
        materialId: material.id,
        materialName: material.name,
        used: Number(requiredAmount.toFixed(2)),
        left: leftQuantity,
        unit: material.unit,
        isLowStock: leftQuantity <= (material.lowStockThreshold || LOW_STOCK_THRESHOLD),
      })
    }

    if (isSupabaseConfigured) {
      for (const summaryItem of productionMaterialSummary) {
        const { error: updateMaterialError } = await supabase
          .from('materials')
          .update({ quantity: summaryItem.left })
          .eq('id', summaryItem.materialId)

        if (updateMaterialError) {
          return { ok: false, message: `Could not update ${summaryItem.materialName} in backend.` }
        }
      }

      const existingGood = finishedGoods.find((good) => good.productId === selectedProduct.id)
      const updatedFinishedQuantity = Number(
        ((existingGood?.quantity || 0) + parsedQuantity).toFixed(2)
      )

      const { error: upsertFinishedGoodError } = await supabase
        .from('finished_goods')
        .upsert(
          [
            {
              product_id: selectedProduct.id,
              product_name: selectedProduct.productName,
              quantity: updatedFinishedQuantity,
            },
          ],
          { onConflict: 'product_id' }
        )

      if (upsertFinishedGoodError) {
        return { ok: false, message: 'Could not update finished goods in backend.' }
      }

      const { data: insertedLog, error: insertLogError } = await supabase
        .from('production_logs')
        .insert([
          {
            product_id: selectedProduct.id,
            product_name: selectedProduct.productName,
            quantity: parsedQuantity,
            material_summary: productionMaterialSummary.map(({ materialId, ...rest }) => rest),
          },
        ])
        .select('*')
        .single()

      if (insertLogError) {
        return { ok: false, message: 'Could not save production log in backend.' }
      }

      setProductionLogs((prevLogs) => [
        {
          id: Number(insertedLog.id),
          productId: insertedLog.product_id ? Number(insertedLog.product_id) : null,
          productName: insertedLog.product_name,
          quantity: Number(insertedLog.quantity),
          materialSummary: Array.isArray(insertedLog.material_summary)
            ? insertedLog.material_summary
            : [],
          createdAt: insertedLog.created_at,
        },
        ...prevLogs,
      ])

      setFinishedGoods((prevGoods) => {
        if (existingGood) {
          return prevGoods.map((good) =>
            good.productId === selectedProduct.id
              ? { ...good, quantity: updatedFinishedQuantity }
              : good
          )
        }

        return [
          ...prevGoods,
          {
            productId: selectedProduct.id,
            productName: selectedProduct.productName,
            quantity: updatedFinishedQuantity,
          },
        ]
      })
    } else {
      setProductionLogs((prevLogs) => [
        {
          id: Date.now(),
          productId: selectedProduct.id,
          productName: selectedProduct.productName,
          quantity: parsedQuantity,
          materialSummary: productionMaterialSummary.map(({ materialId, ...rest }) => rest),
          createdAt: new Date().toISOString(),
        },
        ...prevLogs,
      ])

      setFinishedGoods((prevGoods) => {
        const existingGood = prevGoods.find((good) => good.productId === selectedProduct.id)
        if (existingGood) {
          return prevGoods.map((good) =>
            good.productId === selectedProduct.id
              ? { ...good, quantity: good.quantity + parsedQuantity }
              : good
          )
        }
        return [
          ...prevGoods,
          {
            productId: selectedProduct.id,
            productName: selectedProduct.productName,
            quantity: parsedQuantity,
          },
        ]
      })
    }

    setMaterials((prevMaterials) =>
      prevMaterials.map((material) => {
        const productMaterial = selectedProduct.ingredients.find(
          (ingredient) => ingredient.materialName.toLowerCase() === material.name.toLowerCase()
        )
        if (!productMaterial) {
          return material
        }
        const requiredAmount = productMaterial.amountPerUnit * parsedQuantity
        return {
          ...material,
          quantity: Number((material.quantity - requiredAmount).toFixed(2)),
        }
      })
    )

    return {
      ok: true,
      message: `${parsedQuantity} ${selectedProduct.productName}(s) recorded successfully.`,
      summary: {
        productName: selectedProduct.productName,
        producedQuantity: parsedQuantity,
        materials: productionMaterialSummary.map(({ materialId, ...rest }) => rest),
      },
    }
  }

  const lowStockMaterials = useMemo(
    () =>
      materials.filter((material) => material.quantity <= (material.lowStockThreshold || LOW_STOCK_THRESHOLD)),
    [materials]
  )

  const totalRawMaterials = materials.length
  const totalFinishedGoods = finishedGoods.reduce((sum, item) => sum + item.quantity, 0)
  const totalProductionRuns = productionLogs.length

  const value = {
    isAuthenticated,
    currentUser,
    isBootstrapping,
    login,
    logout,
    materials,
    products,
    productionLogs,
    finishedGoods,
    lowStockMaterials,
    totalRawMaterials,
    totalFinishedGoods,
    totalProductionRuns,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    configureProduct,
    deleteProduct,
    recordProduction,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return context
}
