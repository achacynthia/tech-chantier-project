import express from 'express'
import cors from 'cors'
import { pool, runQuery } from './db.js'

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json())

const VALID_CURRENCIES = new Set(['FCFA', 'USD', 'NGN'])

const getRequestUserKey = (req, res) => {
  const userKey = String(req.headers['x-user-id'] || '').trim()

  if (!userKey) {
    res.status(401).json({ ok: false, message: 'Please login to access your saved data.' })
    return null
  }

  return userKey.slice(0, 120)
}

app.get('/api/health', async (_req, res) => {
  try {
    await runQuery('select 1')
    return res.status(200).json({ ok: true, message: 'Backend is running.' })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Database connection failed.', error: error.message })
  }
})

app.get('/api/products', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const { rows } = await runQuery(
      `select
         p.id,
         p.product_name,
         p.unit_currency,
         p.unit_price,
         coalesce(fg.quantity, 0) as quantity_left,
         coalesce(
           json_agg(
             json_build_object(
               'materialName', pi.material_name,
               'amountPerUnit', pi.amount_per_unit
             )
             order by pi.id
           ) filter (where pi.id is not null),
           '[]'::json
         ) as ingredients
       from products p
       left join finished_goods fg on fg.product_id = p.id and fg.user_key = p.user_key
       left join product_ingredients pi on pi.product_id = p.id and pi.user_key = p.user_key
       where p.user_key = $1
       group by p.id, fg.quantity
       order by p.product_name asc`,
      [userKey]
    )

    return res.status(200).json({
      ok: true,
      data: rows.map((row) => ({
        id: Number(row.id),
        productName: row.product_name,
        unitCurrency: row.unit_currency,
        unitPrice: Number(row.unit_price || 0),
        quantityLeft: Number(row.quantity_left || 0),
        ingredients: Array.isArray(row.ingredients)
          ? row.ingredients.map((ingredient) => ({
              materialName: ingredient.materialName,
              amountPerUnit: Number(ingredient.amountPerUnit || 0),
            }))
          : [],
      })),
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch products.', error: error.message })
  }
})

app.post('/api/materials', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const {
      name,
      quantity,
      unit,
      lowStockThreshold,
      costPrice,
      costCurrency,
      purchaseDate,
    } = req.body || {}

    const normalizedName = (name || '').trim()
    const parsedQuantity = Number(quantity)
    const parsedThreshold = Number(lowStockThreshold)
    const parsedCostPrice = Number(costPrice)
    const normalizedCurrency = (costCurrency || 'USD').trim().toUpperCase()
    const normalizedUnit = (unit || 'unit').trim() || 'unit'
    const normalizedPurchaseDate = purchaseDate || new Date().toISOString().slice(0, 10)

    if (!normalizedName) {
      return res.status(400).json({ ok: false, message: 'Material name is required.' })
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ ok: false, message: 'Quantity must be greater than zero.' })
    }

    if (Number.isNaN(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ ok: false, message: 'Low stock threshold must be zero or greater.' })
    }

    if (Number.isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      return res.status(400).json({ ok: false, message: 'Cost price must be zero or greater.' })
    }

    if (!VALID_CURRENCIES.has(normalizedCurrency)) {
      return res.status(400).json({ ok: false, message: 'Invalid currency.' })
    }

    const existingResult = await runQuery(
      `select id, name, quantity, unit
       from materials
       where user_key = $1 and lower(name) = lower($2)
       limit 1`,
      [userKey, normalizedName]
    )

    if (existingResult.rowCount > 0) {
      const existingMaterial = existingResult.rows[0]
      const updatedQuantity = Number((Number(existingMaterial.quantity || 0) + parsedQuantity).toFixed(2))

      const { rows } = await runQuery(
        `update materials
         set quantity = $1,
             unit = $2,
             low_stock_threshold = $3,
             cost_price = $4,
             cost_currency = $5,
             purchase_date = $6
         where id = $7
         returning id, name, quantity, unit, cost_price, cost_currency, low_stock_threshold, purchase_date`,
        [
          updatedQuantity,
          normalizedUnit,
          parsedThreshold,
          parsedCostPrice,
          normalizedCurrency,
          normalizedPurchaseDate,
          existingMaterial.id,
        ]
      )

      return res.status(200).json({ ok: true, data: rows[0], message: `${rows[0].name} updated successfully.` })
    }

    const { rows } = await runQuery(
      `insert into materials (
        user_key,
        name,
        quantity,
        unit,
        low_stock_threshold,
        cost_price,
        cost_currency,
        purchase_date
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id, name, quantity, unit, cost_price, cost_currency, low_stock_threshold, purchase_date`,
      [
        userKey,
        normalizedName,
        parsedQuantity,
        normalizedUnit,
        parsedThreshold,
        parsedCostPrice,
        normalizedCurrency,
        normalizedPurchaseDate,
      ]
    )

    return res.status(201).json({ ok: true, data: rows[0], message: `${rows[0].name} added to stock.` })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to save material.', error: error.message })
  }
})

app.put('/api/materials/:id', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const parsedId = Number(req.params.id)
    const {
      name,
      quantity,
      unit,
      lowStockThreshold,
      costPrice,
      costCurrency,
      purchaseDate,
    } = req.body || {}

    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid material selected.' })
    }

    const normalizedName = (name || '').trim()
    const normalizedUnit = (unit || 'unit').trim() || 'unit'
    const parsedQuantity = Number(quantity)
    const parsedThreshold = Number(lowStockThreshold)
    const parsedCostPrice = Number(costPrice)
    const normalizedCurrency = (costCurrency || 'USD').trim().toUpperCase()
    const normalizedPurchaseDate = purchaseDate || new Date().toISOString().slice(0, 10)

    if (!normalizedName) {
      return res.status(400).json({ ok: false, message: 'Material name is required.' })
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ ok: false, message: 'Quantity must be zero or greater.' })
    }

    if (Number.isNaN(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ ok: false, message: 'Low stock threshold must be zero or greater.' })
    }

    if (Number.isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      return res.status(400).json({ ok: false, message: 'Cost price must be zero or greater.' })
    }

    if (!VALID_CURRENCIES.has(normalizedCurrency)) {
      return res.status(400).json({ ok: false, message: 'Invalid currency.' })
    }

    const duplicateCheck = await runQuery(
      `select id
       from materials
       where user_key = $1 and lower(name) = lower($2) and id <> $3
       limit 1`,
      [userKey, normalizedName, parsedId]
    )

    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({ ok: false, message: 'Another material already uses this name.' })
    }

    const currentResult = await runQuery(
      `select name from materials where id = $1 and user_key = $2 limit 1`,
      [parsedId, userKey]
    )

    if (currentResult.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Material not found.' })
    }

    const previousName = currentResult.rows[0].name

    const { rows } = await runQuery(
      `update materials
       set name = $1,
           quantity = $2,
           unit = $3,
           low_stock_threshold = $4,
           cost_price = $5,
           cost_currency = $6,
           purchase_date = $7
       where id = $8 and user_key = $9
       returning id, name, quantity, unit, cost_price, cost_currency, low_stock_threshold, purchase_date`,
      [
        normalizedName,
        parsedQuantity,
        normalizedUnit,
        parsedThreshold,
        parsedCostPrice,
        normalizedCurrency,
        normalizedPurchaseDate,
        parsedId,
        userKey,
      ]
    )

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Material not found.' })
    }

    await runQuery(
      `update product_ingredients
       set material_name = $1
       where user_key = $2 and lower(material_name) = lower($3)`,
      [rows[0].name, userKey, previousName]
    )

    return res.status(200).json({ ok: true, data: rows[0], message: `${rows[0].name} updated successfully.` })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to update material.', error: error.message })
  }
})

app.delete('/api/materials/:id', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const parsedId = Number(req.params.id)
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid material selected.' })
    }

    const { rows } = await runQuery(
      `delete from materials
       where id = $1 and user_key = $2
       returning id, name`,
      [parsedId, userKey]
    )

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Material not found.' })
    }

    return res.status(200).json({ ok: true, message: `${rows[0].name} deleted.` })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to delete material.', error: error.message })
  }
})

app.post('/api/products/configure', async (req, res) => {
  const client = await pool.connect()

  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const {
      productId,
      productName,
      unitCurrency,
      unitPrice,
      ingredients,
    } = req.body || {}

    const name = (productName || '').trim()
    const currency = (unitCurrency || '').trim().toUpperCase()
    const parsedUnitPrice = Number(unitPrice)
    const parsedProductId = Number(productId)

    if (!name) {
      return res.status(400).json({ ok: false, message: 'Product name is required.' })
    }

    if (!VALID_CURRENCIES.has(currency)) {
      return res.status(400).json({ ok: false, message: 'Please choose a valid unit price currency.' })
    }

    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return res.status(400).json({ ok: false, message: 'Unit price must be a valid number.' })
    }

    const validIngredients = Array.isArray(ingredients)
      ? ingredients
          .map((ingredient) => ({
            materialName: (ingredient.materialName || '').trim(),
            amountPerUnit: Number(ingredient.amountPerUnit),
          }))
          .filter((ingredient) => ingredient.materialName && !Number.isNaN(ingredient.amountPerUnit) && ingredient.amountPerUnit > 0)
      : []

    if (validIngredients.length === 0) {
      return res.status(400).json({ ok: false, message: 'Add at least one valid recipe entry.' })
    }

    const hasDuplicate = validIngredients.some(
      (entry, index) => validIngredients.findIndex((item) => item.materialName.toLowerCase() === entry.materialName.toLowerCase()) !== index
    )

    if (hasDuplicate) {
      return res.status(400).json({ ok: false, message: 'A material can only appear once in the same recipe.' })
    }

    await client.query('begin')

    let productRow = null

    if (!Number.isNaN(parsedProductId)) {
      const updateResult = await client.query(
        `update products
         set product_name = $1,
             unit_currency = $2,
             unit_price = $3
         where id = $4 and user_key = $5
         returning id, product_name, unit_currency, unit_price`,
        [name, currency, parsedUnitPrice, parsedProductId, userKey]
      )

      productRow = updateResult.rows[0] || null
    }

    if (!productRow) {
      const existingByName = await client.query(
        `select id, product_name, unit_currency, unit_price
         from products
         where user_key = $1 and lower(product_name) = lower($2)
         limit 1`,
        [userKey, name]
      )

      if (existingByName.rowCount > 0) {
        const updateByName = await client.query(
          `update products
           set product_name = $1,
               unit_currency = $2,
               unit_price = $3
           where id = $4 and user_key = $5
           returning id, product_name, unit_currency, unit_price`,
          [name, currency, parsedUnitPrice, existingByName.rows[0].id, userKey]
        )
        productRow = updateByName.rows[0]
      } else {
        const insertResult = await client.query(
          `insert into products (user_key, product_name, unit_currency, unit_price)
           values ($1, $2, $3, $4)
           returning id, product_name, unit_currency, unit_price`,
          [userKey, name, currency, parsedUnitPrice]
        )
        productRow = insertResult.rows[0]
      }
    }

    await client.query(
      `delete from product_ingredients where product_id = $1 and user_key = $2`,
      [productRow.id, userKey]
    )

    await client.query(
      `insert into product_ingredients (user_key, product_id, material_name, amount_per_unit)
       values ${validIngredients.map((_, index) => `($1, $2, $${index * 2 + 3}, $${index * 2 + 4})`).join(', ')}`,
      [
        userKey,
        productRow.id,
        ...validIngredients.flatMap((ingredient) => [ingredient.materialName, ingredient.amountPerUnit]),
      ]
    )

    const ingredientsResult = await client.query(
      `select material_name, amount_per_unit
       from product_ingredients
       where product_id = $1 and user_key = $2
       order by id asc`,
      [productRow.id, userKey]
    )

    await client.query('commit')

    return res.status(200).json({
      ok: true,
      data: {
        id: Number(productRow.id),
        productName: productRow.product_name,
        unitCurrency: productRow.unit_currency,
        unitPrice: Number(productRow.unit_price || 0),
        ingredients: ingredientsResult.rows.map((ingredient) => ({
          materialName: ingredient.material_name,
          amountPerUnit: Number(ingredient.amount_per_unit || 0),
        })),
      },
      message: `${productRow.product_name} recipe configured.`,
    })
  } catch (error) {
    await client.query('rollback')
    return res.status(500).json({ ok: false, message: 'Failed to configure product.', error: error.message })
  } finally {
    client.release()
  }
})

app.delete('/api/products/:id', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const parsedId = Number(req.params.id)
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid product selected.' })
    }

    await runQuery(`delete from finished_goods where product_id = $1 and user_key = $2`, [parsedId, userKey])

    const { rows } = await runQuery(
      `delete from products
       where id = $1 and user_key = $2
       returning id, product_name`,
      [parsedId, userKey]
    )

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Product not found.' })
    }

    return res.status(200).json({ ok: true, message: `${rows[0].product_name} deleted.` })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to delete product.', error: error.message })
  }
})

app.get('/api/production-logs', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const { rows } = await runQuery(
      `select id, product_id, product_name, quantity, material_summary, created_at
       from production_logs
       where user_key = $1
       order by created_at desc`,
      [userKey]
    )

    return res.status(200).json({ ok: true, data: rows })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch production logs.', error: error.message })
  }
})

app.post('/api/production', async (req, res) => {
  const client = await pool.connect()

  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const { productId, quantity, productionDate } = req.body || {}
    const parsedProductId = Number(productId)
    const parsedQuantity = Number(quantity)
    const normalizedDate = productionDate || new Date().toISOString().slice(0, 10)
    const productionTimestamp = `${normalizedDate}T12:00:00.000Z`

    if (Number.isNaN(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ ok: false, message: 'Select a product.' })
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ ok: false, message: 'Production quantity must be greater than zero.' })
    }

    await client.query('begin')

    const productResult = await client.query(
      `select id, product_name
       from products
       where id = $1 and user_key = $2
       limit 1`,
      [parsedProductId, userKey]
    )

    if (productResult.rowCount === 0) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, message: 'Selected product was not found.' })
    }

    const productRow = productResult.rows[0]

    const ingredientResult = await client.query(
      `select material_name, amount_per_unit
       from product_ingredients
       where product_id = $1 and user_key = $2`,
      [parsedProductId, userKey]
    )

    if (ingredientResult.rowCount === 0) {
      await client.query('rollback')
      return res.status(400).json({ ok: false, message: 'Recipe is empty for this product.' })
    }

    const materialSummary = []

    for (const ingredient of ingredientResult.rows) {
      const materialResult = await client.query(
        `select id, name, quantity, unit, low_stock_threshold
         from materials
         where user_key = $1 and lower(name) = lower($2)
         limit 1
         for update`,
        [userKey, ingredient.material_name]
      )

      if (materialResult.rowCount === 0) {
        await client.query('rollback')
        return res.status(400).json({ ok: false, message: `Required material ${ingredient.material_name} is missing.` })
      }

      const material = materialResult.rows[0]
      const requiredAmount = Number(ingredient.amount_per_unit) * parsedQuantity

      if (Number(material.quantity) < requiredAmount) {
        await client.query('rollback')
        return res.status(400).json({
          ok: false,
          message: `Not enough ${material.name}. Required ${requiredAmount} ${material.unit}, available ${material.quantity} ${material.unit}.`,
        })
      }

      const left = Number((Number(material.quantity) - requiredAmount).toFixed(2))

      await client.query(
        `update materials
         set quantity = $1
         where id = $2`,
        [left, material.id]
      )

      materialSummary.push({
        materialName: material.name,
        used: Number(requiredAmount.toFixed(2)),
        left,
        unit: material.unit,
        isLowStock: left <= Number(material.low_stock_threshold || 10),
      })
    }

    const finishedGoodResult = await client.query(
      `select product_id, quantity
       from finished_goods
       where product_id = $1 and user_key = $2
       limit 1
       for update`,
      [parsedProductId, userKey]
    )

    const updatedFinishedQuantity = Number(((Number(finishedGoodResult.rows[0]?.quantity || 0)) + parsedQuantity).toFixed(2))

    if (finishedGoodResult.rowCount > 0) {
      await client.query(
        `update finished_goods
         set quantity = $1,
             product_name = $2,
             updated_at = now()
         where product_id = $3 and user_key = $4`,
        [updatedFinishedQuantity, productRow.product_name, parsedProductId, userKey]
      )
    } else {
      await client.query(
        `insert into finished_goods (user_key, product_id, product_name, quantity)
         values ($1, $2, $3, $4)`,
        [userKey, parsedProductId, productRow.product_name, updatedFinishedQuantity]
      )
    }

    const logResult = await client.query(
      `insert into production_logs (
        user_key,
        product_id,
        product_name,
        quantity,
        material_summary,
        created_at
      )
      values ($1, $2, $3, $4, $5::jsonb, $6)
      returning id, product_id, product_name, quantity, material_summary, created_at`,
      [
        userKey,
        parsedProductId,
        productRow.product_name,
        parsedQuantity,
        JSON.stringify(materialSummary),
        productionTimestamp,
      ]
    )

    await client.query('commit')

    return res.status(201).json({
      ok: true,
      data: {
        log: logResult.rows[0],
        updatedMaterials: materialSummary,
        finishedGood: {
          productId: parsedProductId,
          productName: productRow.product_name,
          quantity: updatedFinishedQuantity,
        },
      },
      message: `${parsedQuantity} ${productRow.product_name}(s) recorded successfully.`,
    })
  } catch (error) {
    await client.query('rollback')
    return res.status(500).json({ ok: false, message: 'Failed to record production.', error: error.message })
  } finally {
    client.release()
  }
})

app.get('/api/materials', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const { rows } = await runQuery(
      `select id, name, quantity, unit, cost_price, cost_currency, low_stock_threshold, purchase_date
       from materials
       where user_key = $1
       order by name asc`,
      [userKey]
    )

    return res.status(200).json({
      ok: true,
      data: rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        quantity: Number(row.quantity || 0),
        unit: row.unit,
        costPrice: Number(row.cost_price || 0),
        costCurrency: row.cost_currency,
        lowStockThreshold: Number(row.low_stock_threshold || 0),
        purchaseDate: row.purchase_date,
      })),
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch materials.', error: error.message })
  }
})

app.get('/api/sales', async (req, res) => {
  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const {
      productId = '',
      date = '',
      sortBy = 'quantity-desc',
      page = '1',
      pageSize = '10',
    } = req.query

    const filters = ['user_key = $1']
    const values = [userKey]

    if (productId) {
      values.push(Number(productId))
      filters.push(`product_id = $${values.length}`)
    }

    if (date) {
      values.push(date)
      filters.push(`sale_date = $${values.length}`)
    }

    const whereClause = filters.length > 0 ? `where ${filters.join(' and ')}` : ''

    const sortMap = {
      'quantity-desc': 'quantity_sold desc',
      'quantity-asc': 'quantity_sold asc',
      'revenue-desc': 'total_amount desc',
      'revenue-asc': 'total_amount asc',
    }

    const orderBy = sortMap[sortBy] || 'sale_date desc'
    const pageNumber = Math.max(1, Number(page) || 1)
    const limit = Math.max(1, Math.min(100, Number(pageSize) || 10))
    const offset = (pageNumber - 1) * limit

    values.push(limit)
    values.push(offset)

    const { rows } = await runQuery(
      `select id, product_id, product_name, quantity_sold, unit_currency, unit_price, total_amount, quantity_left, sale_date, created_at
       from sales
       ${whereClause}
       order by ${orderBy}
       limit $${values.length - 1} offset $${values.length}`,
      values
    )

    return res.status(200).json({ ok: true, data: rows })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch sales.', error: error.message })
  }
})

app.post('/api/sales', async (req, res) => {
  const client = await pool.connect()

  try {
    const userKey = getRequestUserKey(req, res)
    if (!userKey) return

    const {
      productId,
      quantitySold,
      saleDate,
      unitPrice,
    } = req.body || {}

    const parsedProductId = Number(productId)
    const parsedQuantity = Number(quantitySold)

    if (Number.isNaN(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid product selected.' })
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ ok: false, message: 'Quantity sold must be greater than zero.' })
    }

    await client.query('begin')

    const productResult = await client.query(
      `select id, product_name, unit_currency, unit_price
       from products
       where id = $1 and user_key = $2
       for update`,
      [parsedProductId, userKey]
    )

    if (productResult.rowCount === 0) {
      await client.query('rollback')
      return res.status(404).json({ ok: false, message: 'Product not found.' })
    }

    const product = productResult.rows[0]

    const finishedGoodsResult = await client.query(
      `select product_id, product_name, quantity
       from finished_goods
       where product_id = $1 and user_key = $2
       for update`,
      [parsedProductId, userKey]
    )

    const availableQuantity = Number(finishedGoodsResult.rows[0]?.quantity || 0)

    if (availableQuantity <= 0 || parsedQuantity > availableQuantity) {
      await client.query('rollback')
      return res.status(400).json({ ok: false, message: 'Insufficient stock to complete sale.' })
    }

    const effectiveUnitPrice = Number(unitPrice ?? product.unit_price)
    const normalizedUnitPrice = Number.isNaN(effectiveUnitPrice) || effectiveUnitPrice < 0
      ? Number(product.unit_price || 0)
      : effectiveUnitPrice

    const quantityLeft = Number((availableQuantity - parsedQuantity).toFixed(2))
    const totalAmount = Number((parsedQuantity * normalizedUnitPrice).toFixed(2))
    const normalizedSaleDate = saleDate || new Date().toISOString().slice(0, 10)

    await client.query(
      `update finished_goods
       set quantity = $1,
           updated_at = now()
       where product_id = $2 and user_key = $3`,
      [quantityLeft, parsedProductId, userKey]
    )

    const insertSaleResult = await client.query(
      `insert into sales (
        user_key,
        product_id,
        product_name,
        quantity_sold,
        unit_currency,
        unit_price,
        total_amount,
        quantity_left,
        sale_date
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, product_id, product_name, quantity_sold, unit_currency, unit_price, total_amount, quantity_left, sale_date, created_at`,
      [
        userKey,
        parsedProductId,
        product.product_name,
        parsedQuantity,
        product.unit_currency || 'USD',
        normalizedUnitPrice,
        totalAmount,
        quantityLeft,
        normalizedSaleDate,
      ]
    )

    await client.query('commit')

    return res.status(201).json({ ok: true, data: insertSaleResult.rows[0], message: 'Sale recorded successfully.' })
  } catch (error) {
    await client.query('rollback')
    return res.status(500).json({ ok: false, message: 'Failed to record sale.', error: error.message })
  } finally {
    client.release()
  }
})

app.listen(port, () => {
  console.log(`Node backend running on http://localhost:${port}`)
})
