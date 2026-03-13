import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const AppContext = createContext(null)  // Create the context with a default value of null

const LOCAL_USERS_KEY = 'production_tracker_local_users'
const LOCAL_SESSION_KEY = 'production_tracker_local_session'
const LOCAL_STOCK_PURCHASES_KEY = 'production_tracker_stock_purchases'

const LOW_STOCK_THRESHOLD = 10
const VALID_CURRENCIES = new Set(['FCFA', 'USD', 'NGN'])
const DEFAULT_PURCHASE_DATE = new Date().toISOString().slice(0, 10)

const initialMaterials = [
  { id: 1, name: 'Flour (kg)', quantity: 120, unit: 'kg', lowStockThreshold: LOW_STOCK_THRESHOLD, costPrice: 0, costCurrency: 'USD', purchaseDate: DEFAULT_PURCHASE_DATE },
  { id: 2, name: 'Yeast (g)', quantity: 1500, unit: 'g', lowStockThreshold: LOW_STOCK_THRESHOLD, costPrice: 0, costCurrency: 'USD', purchaseDate: DEFAULT_PURCHASE_DATE },
  { id: 3, name: 'Sugar (kg)', quantity: 40, unit: 'kg', lowStockThreshold: LOW_STOCK_THRESHOLD, costPrice: 0, costCurrency: 'USD', purchaseDate: DEFAULT_PURCHASE_DATE },
]

const initialProducts = [
  {
    id: 1,
    productName: 'Bread Loaf',
    unitCurrency: 'USD',
    unitPrice: 0,
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
  costPrice: Number(record.cost_price || 0),
  costCurrency: record.cost_currency || 'USD',
  purchaseDate: record.purchase_date || DEFAULT_PURCHASE_DATE,
})

const mapProductRecord = (record) => ({
  id: Number(record.id),
  productName: record.product_name,
  unitCurrency: record.unit_currency || 'USD',
  unitPrice: Number(record.unit_price || 0),
  ingredients: (record.product_ingredients || []).map((ingredient) => ({
    materialName: ingredient.material_name,
    amountPerUnit: Number(ingredient.amount_per_unit),
  })),
})

const mapSalesRecord = (record) => ({
  id: Number(record.id),
  productId: record.product_id ? Number(record.product_id) : null,
  productName: record.product_name,
  quantitySold: Number(record.quantity_sold),
  unitCurrency: record.unit_currency || 'USD',
  unitPrice: Number(record.unit_price || 0),
  totalAmount: Number(record.total_amount || 0),
  quantityLeft: Number(record.quantity_left || 0),
  saleDate: record.sale_date,
  createdAt: record.created_at || `${record.sale_date}T12:00:00.000Z`,
})

const mapAppUserRecord = (record) => ({
  id: record.auth_user_id || record.id,
  firstName: record.first_name || '',
  lastName: record.last_name || '',
  name: record.name || `${record.first_name || ''} ${record.last_name || ''}`.trim(),
  email: record.email || '',
  country: record.country || '',
})

const getReadableAuthError = (errorMessage, defaultMessage) => {
  const normalizedMessage = (errorMessage || '').toLowerCase()

  if (normalizedMessage.includes('email rate limit exceeded')) {
    return 'Too many signup email requests. If this account already exists, use Login now. Otherwise wait a few minutes and try again.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Please confirm your email first, then login.'
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'This email is already registered. Please login instead.'
  }

  return errorMessage || defaultMessage
}

const isLikelyEmail = (value) => (value || '').includes('@')

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (isSupabaseConfigured) {
      return false
    }

    try {
      return Boolean(localStorage.getItem(LOCAL_SESSION_KEY))
    } catch {
      return false
    }
  })
  const [currentUser, setCurrentUser] = useState(() => {
    if (isSupabaseConfigured) {
      return null
    }

    try {
      const rawSession = localStorage.getItem(LOCAL_SESSION_KEY)
      return rawSession ? JSON.parse(rawSession) : null
    } catch {
      return null
    }
  })
  const [materials, setMaterials] = useState(initialMaterials)
  const [products, setProducts] = useState(initialProducts)
  const [productionLogs, setProductionLogs] = useState([])
  const [salesLogs, setSalesLogs] = useState([])
  const [stockPurchases, setStockPurchases] = useState(() => {
    if (isSupabaseConfigured) {
      return []
    }

    try {
      const rawLogs = localStorage.getItem(LOCAL_STOCK_PURCHASES_KEY)
      const parsedLogs = rawLogs ? JSON.parse(rawLogs) : []
      return Array.isArray(parsedLogs) ? parsedLogs : []
    } catch {
      return []
    }
  })
  const [finishedGoods, setFinishedGoods] = useState([])
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [localUsers, setLocalUsers] = useState(() => {
    if (isSupabaseConfigured) {
      return []
    }

    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_KEY)
      const parsedUsers = rawUsers ? JSON.parse(rawUsers) : []
      return Array.isArray(parsedUsers) ? parsedUsers : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (isSupabaseConfigured) {
      return
    }

    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers))
    } catch {
      // Ignore storage write failures in local-only mode
    }
  }, [localUsers])

  useEffect(() => {
    if (isSupabaseConfigured) {
      return
    }

    try {
      if (isAuthenticated && currentUser) {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(currentUser))
      } else {
        localStorage.removeItem(LOCAL_SESSION_KEY)
      }
    } catch {
      // Ignore storage write failures in local-only mode
    }
  }, [isAuthenticated, currentUser])

  useEffect(() => {
    if (isSupabaseConfigured) {
      return
    }

    try {
      localStorage.setItem(LOCAL_STOCK_PURCHASES_KEY, JSON.stringify(stockPurchases))
    } catch {
      // Ignore storage write failures in local-only mode
    }
  }, [stockPurchases])

  const syncAppUserProfile = async (authUser, fallback = {}) => {
    const metadata = authUser?.user_metadata || {}
    const firstName = (fallback.firstName || metadata.first_name || '').trim()
    const lastName = (fallback.lastName || metadata.last_name || '').trim()
    const country = (fallback.country || metadata.country || '').trim()
    const derivedName = `${firstName} ${lastName}`.trim() || authUser.email

    const payload = {
      auth_user_id: authUser.id,
      first_name: firstName || null,
      last_name: lastName || null,
      name: derivedName,
      email: authUser.email,
      country: country || null,
    }

    const { data, error } = await supabase
      .from('app_users')
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select('id, auth_user_id, first_name, last_name, name, email, country')
      .single()

    if (error) {
      console.error('Failed to sync app user profile:', error)
      return {
        id: authUser.id,
        firstName,
        lastName,
        name: derivedName,
        email: authUser.email || '',
        country,
      }
    }

    return mapAppUserRecord(data)
  }

  const hydrateAuthUser = async (authUser) => {
    if (!authUser) {
      setCurrentUser(null)
      setIsAuthenticated(false)
      return
    }

    const profile = await syncAppUserProfile(authUser)
    setCurrentUser(profile)
    setIsAuthenticated(true)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false)
      return
    }

    let isMounted = true

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to get Supabase auth session:', error)
      }

      if (!isMounted) {
        return
      }

      const authUser = data?.session?.user || null
      await hydrateAuthUser(authUser)
      setIsAuthLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return
      }

      await hydrateAuthUser(session?.user || null)
      setIsAuthLoading(false)
    })

    initializeAuth()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchAllData = async () => {
      if (!isSupabaseConfigured) {
        setIsBootstrapping(false)
        return
      }

      if (!isAuthenticated) {
        setMaterials(initialMaterials)
        setProducts(initialProducts)
        setFinishedGoods([])
        setProductionLogs([])
        setSalesLogs([])
        setIsBootstrapping(false)
        return
      }

      setIsBootstrapping(true)

      const loadFromSupabase = async () => {
        const [materialsResult, productsResult, logsResult, finishedGoodsResult, salesResult] = await Promise.all([
          supabase.from('materials').select('*').order('id', { ascending: true }),
          supabase
            .from('products')
            .select('id, product_name, unit_price, unit_currency, product_ingredients(material_name, amount_per_unit)')
            .order('id', { ascending: true }),
          supabase.from('production_logs').select('*').order('created_at', { ascending: false }),
          supabase.from('finished_goods').select('*').order('product_name', { ascending: true }),
          supabase.from('sales').select('*').order('created_at', { ascending: false }),
        ])

        if (materialsResult.error) throw materialsResult.error
        if (productsResult.error) throw productsResult.error
        if (logsResult.error) throw logsResult.error
        if (finishedGoodsResult.error) throw finishedGoodsResult.error
        if (salesResult.error) throw salesResult.error

        return {
          materialsData: materialsResult.data || [],
          productsData: productsResult.data || [],
          logsData: logsResult.data || [],
          finishedGoodsData: finishedGoodsResult.data || [],
          salesData: salesResult.data || [],
        }
      }

      const seedDefaultData = async () => {
        const { error: materialsSeedError } = await supabase.from('materials').upsert(
          initialMaterials.map((material) => ({
            name: material.name,
            quantity: material.quantity,
            unit: material.unit,
            low_stock_threshold: material.lowStockThreshold,
            cost_price: material.costPrice,
            cost_currency: material.costCurrency,
            purchase_date: material.purchaseDate,
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
            .insert([
              {
                product_name: initialProducts[0].productName,
                unit_currency: initialProducts[0].unitCurrency,
                unit_price: initialProducts[0].unitPrice,
              },
            ])
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
        setSalesLogs(allData.salesData.map(mapSalesRecord))
      } catch (error) {
        console.error('Supabase bootstrap failed:', error)
      } finally {
        setIsBootstrapping(false)
      }
    }

    fetchAllData()
  }, [isAuthenticated])

  const signup = async ({ firstName, lastName, email, password, country, confirmPassword }) => {
    const normalizedFirstName = firstName?.trim()
    const normalizedLastName = lastName?.trim()
    const normalizedEmail = email?.trim().toLowerCase()
    const normalizedPassword = password?.trim()
    const normalizedCountry = country?.trim()
    const derivedName = `${normalizedFirstName || ''} ${normalizedLastName || ''}`
      .trim()
      .replace(/\s+/g, ' ')
    const fullName = derivedName || normalizedEmail?.split('@')?.[0] || 'User'

    if (!normalizedEmail || !normalizedPassword) {
      return {
        ok: false,
        message: 'Please enter email and password.',
      }
    }

    if (!isSupabaseConfigured) {
      const existingLocalUser = localUsers.find(
        (user) => user.email.toLowerCase() === normalizedEmail
      )

      if (existingLocalUser) {
        return { ok: false, message: 'This email is already registered. Please login instead.' }
      }

      setLocalUsers((prevUsers) => [
        ...prevUsers,
        {
          id: Date.now(),
          firstName: normalizedFirstName || '',
          lastName: normalizedLastName || '',
          name: fullName,
          email: normalizedEmail,
          country: normalizedCountry || '',
          password: normalizedPassword,
        },
      ])

      return { ok: true, message: 'Sign up successful. Please login with your name and password.' }
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: {
          first_name: normalizedFirstName || null,
          last_name: normalizedLastName || null,
          country: normalizedCountry || null,
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      const normalizedSignUpError = (signUpError.message || '').toLowerCase()

      if (normalizedSignUpError.includes('email rate limit exceeded')) {
        const { data: existingSignInData, error: existingSignInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })

        if (!existingSignInError && existingSignInData?.user) {
          await hydrateAuthUser(existingSignInData.user)
          return { ok: true, message: 'Account already exists. You are now logged in.' }
        }
      }

      if (normalizedSignUpError.includes('user already registered')) {
        const { data: existingSignInData, error: existingSignInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })

        if (!existingSignInError && existingSignInData?.user) {
          await hydrateAuthUser(existingSignInData.user)
          return { ok: true, message: 'Account already exists. You are now logged in.' }
        }
      }

      return {
        ok: false,
        message: getReadableAuthError(signUpError.message, 'Unable to create account right now.'),
      }
    }

    if (signUpData?.user && signUpData?.session) {
      await syncAppUserProfile(signUpData.user, {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        country: normalizedCountry,
      })
    }

    if (signUpData?.session) {
      return { ok: true, message: 'Sign up successful. You are now logged in.' }
    }

    return {
      ok: true,
      message: 'Sign up successful. Check your email to verify, then login with your name and password.',
    }
  }

  const login = async ({ name, password }) => {
    const normalizedIdentifier = name?.trim().replace(/\s+/g, ' ')
    const normalizedPassword = password?.trim()

    if (!normalizedIdentifier || !normalizedPassword) {
      return { ok: false, message: 'Please enter both name and password.' }
    }

    if (!isSupabaseConfigured) {
      const userRecord = localUsers.find(
        (user) =>
          (isLikelyEmail(normalizedIdentifier)
            ? user.email.toLowerCase() === normalizedIdentifier.toLowerCase()
            : user.name.toLowerCase() === normalizedIdentifier.toLowerCase()) &&
          user.password === normalizedPassword
      )

      if (!userRecord) {
        return { ok: false, message: 'Invalid name or password.' }
      }

      setCurrentUser({
        id: userRecord.id,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        name: userRecord.name,
        email: userRecord.email,
        country: userRecord.country,
      })
      setIsAuthenticated(true)
      return { ok: true, message: `Welcome, ${userRecord.firstName}.` }
    }

    let matchedEmail = null

    if (isLikelyEmail(normalizedIdentifier)) {
      matchedEmail = normalizedIdentifier.toLowerCase()
    } else {
      const { data: matchedProfile, error: profileLookupError } = await supabase
        .from('app_users')
        .select('email, name')
        .ilike('name', normalizedIdentifier)
        .limit(1)
        .maybeSingle()

      if (profileLookupError) {
        return { ok: false, message: 'Could not find account by name. Please try again.' }
      }

      if (!matchedProfile?.email) {
        return {
          ok: false,
          message:
            'No profile found for this full name yet. Login once with your email and password to initialize your profile, then name login will work.',
        }
      }

      matchedEmail = matchedProfile.email
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: matchedEmail,
      password: normalizedPassword,
    })

    if (signInError) {
      const normalizedAuthError = (signInError.message || '').toLowerCase()
      if (normalizedAuthError.includes('invalid login credentials')) {
        return { ok: false, message: 'Invalid name or password.' }
      }

      return {
        ok: false,
        message: getReadableAuthError(signInError.message, 'Invalid name or password.'),
      }
    }

    if (signInData?.user) {
      await hydrateAuthUser(signInData.user)
      return {
        ok: true,
        message: `Welcome, ${signInData.user.user_metadata?.first_name || signInData.user.email}.`,
      }
    }

    return { ok: false, message: 'Unable to login right now. Please try again.' }
  }

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }

    setIsAuthenticated(false)
    setCurrentUser(null)

    if (!isSupabaseConfigured) {
      try {
        localStorage.removeItem(LOCAL_SESSION_KEY)
      } catch {
        // Ignore storage remove failures in local-only mode
      }
    }
  }

  const addMaterial = async (materialPayload) => {
    const name = materialPayload.name.trim()
    if (!name) {
      return { ok: false, message: 'Material name is required.' }
    }

    const quantity = Number(materialPayload.quantity)
    const costPrice = Number(materialPayload.costPrice || 0)
    const costCurrency = (materialPayload.costCurrency || 'USD').trim().toUpperCase()
    const lowStockThreshold = Number(materialPayload.lowStockThreshold || LOW_STOCK_THRESHOLD)
    const selectedPurchaseDate = materialPayload.purchaseDate?.trim() || new Date().toISOString().slice(0, 10)
    const purchaseTimestamp = new Date(`${selectedPurchaseDate}T12:00:00`).toISOString()

    if (Number.isNaN(quantity) || quantity <= 0) {
      return { ok: false, message: 'Quantity must be greater than zero.' }
    }

    if (Number.isNaN(costPrice) || costPrice < 0) {
      return { ok: false, message: 'Cost price must be zero or greater.' }
    }

    if (!VALID_CURRENCIES.has(costCurrency)) {
      return { ok: false, message: 'Please choose a valid material cost currency.' }
    }

    const existingMaterial = materials.find(
      (material) => material.name.toLowerCase() === name.toLowerCase()
    )

    if (existingMaterial) {
      const updatedQuantity = Number((existingMaterial.quantity + quantity).toFixed(2))

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('materials')
          .update({
            quantity: updatedQuantity,
            cost_price: costPrice,
            cost_currency: costCurrency,
            purchase_date: selectedPurchaseDate,
          })
          .eq('id', existingMaterial.id)

        if (error) {
          return { ok: false, message: 'Could not update material in backend.' }
        }
      }

      setMaterials((prevMaterials) =>
        prevMaterials.map((material) =>
          material.id === existingMaterial.id
            ? {
                ...material,
                quantity: updatedQuantity,
                costPrice,
                costCurrency,
                purchaseDate: selectedPurchaseDate,
              }
            : material
        )
      )
      setStockPurchases((prevLogs) => [
        {
          id: Date.now(),
          materialId: existingMaterial.id,
          materialName: existingMaterial.name,
          quantityPurchased: quantity,
          unit: existingMaterial.unit,
          purchaseDate: selectedPurchaseDate,
          createdAt: purchaseTimestamp,
        },
        ...prevLogs,
      ])
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
            cost_price: costPrice,
            cost_currency: costCurrency,
            purchase_date: selectedPurchaseDate,
          },
        ])
        .select('*')
        .single()

      if (error) {
        return { ok: false, message: 'Could not add material to backend.' }
      }

      setMaterials((prevMaterials) => [...prevMaterials, mapMaterialRecord(data)])
      setStockPurchases((prevLogs) => [
        {
          id: Date.now(),
          materialId: Number(data.id),
          materialName: data.name,
          quantityPurchased: Number(data.quantity),
          unit: data.unit,
          purchaseDate: selectedPurchaseDate,
          createdAt: purchaseTimestamp,
        },
        ...prevLogs,
      ])
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
        costPrice,
        costCurrency,
        purchaseDate: selectedPurchaseDate,
      },
    ])
    setStockPurchases((prevLogs) => [
      {
        id: Date.now(),
        materialId: null,
        materialName: name,
        quantityPurchased: quantity,
        unit,
        purchaseDate: selectedPurchaseDate,
        createdAt: purchaseTimestamp,
      },
      ...prevLogs,
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
    const costPrice = Number(materialPayload.costPrice || 0)
    const costCurrency = (materialPayload.costCurrency || 'USD').trim().toUpperCase()
    const lowStockThreshold = Number(materialPayload.lowStockThreshold)
    const selectedPurchaseDate = materialPayload.purchaseDate?.trim() || DEFAULT_PURCHASE_DATE

    if (!name) {
      return { ok: false, message: 'Material name is required.' }
    }

    if (Number.isNaN(quantity) || quantity < 0) {
      return { ok: false, message: 'Quantity must be zero or greater.' }
    }

    if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      return { ok: false, message: 'Low stock threshold must be zero or greater.' }
    }

    if (Number.isNaN(costPrice) || costPrice < 0) {
      return { ok: false, message: 'Cost price must be zero or greater.' }
    }

    if (!VALID_CURRENCIES.has(costCurrency)) {
      return { ok: false, message: 'Please choose a valid material cost currency.' }
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
          cost_price: costPrice,
          cost_currency: costCurrency,
          purchase_date: selectedPurchaseDate,
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
              costPrice,
              costCurrency,
              purchaseDate: selectedPurchaseDate,
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

  const configureProduct = async ({ productId, productName, unitCurrency, unitPrice, ingredients }) => {
    const name = productName.trim()
    if (!name) {
      return { ok: false, message: 'Product name is required.' }
    }

    const currency = (unitCurrency || '').trim().toUpperCase()
    const validCurrencies = new Set(['FCFA', 'USD', 'NGN'])
    if (!validCurrencies.has(currency)) {
      return { ok: false, message: 'Please choose a valid unit price currency.' }
    }

    const parsedUnitPrice = Number(unitPrice)
    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return { ok: false, message: 'Unit price must be a valid number.' }
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
          .update({ product_name: name, unit_currency: currency, unit_price: parsedUnitPrice })
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
            ? {
                ...product,
                productName: name,
                unitCurrency: currency,
                unitPrice: parsedUnitPrice,
                ingredients: validIngredients,
              }
            : product
        )
      )
      return { ok: true, message: `${name} recipe updated.` }
    }

    if (isSupabaseConfigured) {
      const { data: insertedProduct, error: insertProductError } = await supabase
        .from('products')
        .insert([{ product_name: name, unit_currency: currency, unit_price: parsedUnitPrice }])
        .select('id, product_name, unit_currency, unit_price')
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
          unitCurrency: insertedProduct.unit_currency || 'USD',
          unitPrice: Number(insertedProduct.unit_price || 0),
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
        unitCurrency: currency,
        unitPrice: parsedUnitPrice,
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

  const recordProduction = async ({ productId, quantity, productionDate }) => {
    const parsedProductId = Number(productId)
    const parsedQuantity = Number(quantity)
    const selectedProductionDate = productionDate?.trim() || new Date().toISOString().slice(0, 10)
    const productionTimestamp = new Date(`${selectedProductionDate}T12:00:00`).toISOString()

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
            created_at: productionTimestamp,
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
          createdAt: productionTimestamp,
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

  const recordSale = async ({ productId, quantitySold, saleDate, unitPrice }) => {
    const parsedProductId = Number(productId)
    const parsedQuantitySold = Number(quantitySold)
    const parsedUnitPrice = Number(unitPrice)
    const selectedSaleDate = saleDate?.trim() || new Date().toISOString().slice(0, 10)
    const saleTimestamp = new Date(`${selectedSaleDate}T12:00:00`).toISOString()

    if (Number.isNaN(parsedProductId)) {
      return { ok: false, message: 'Select a product.' }
    }

    if (Number.isNaN(parsedQuantitySold) || parsedQuantitySold <= 0) {
      return { ok: false, message: 'Quantity sold must be greater than zero.' }
    }

    if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      return { ok: false, message: 'Unit price must be zero or greater.' }
    }

    const selectedProduct = products.find((product) => product.id === parsedProductId)
    if (!selectedProduct) {
      return { ok: false, message: 'Selected product was not found.' }
    }

    const stockEntry = finishedGoods.find((item) => item.productId === parsedProductId)
    const availableQuantity = Number(stockEntry?.quantity || 0)

    if (availableQuantity <= 0) {
      return { ok: false, message: 'Insufficient stock to complete sale.' }
    }

    if (parsedQuantitySold > availableQuantity) {
      return {
        ok: false,
        message: `Insufficient stock to complete sale. Available quantity is ${availableQuantity}.`,
      }
    }

    const updatedQuantityLeft = Number((availableQuantity - parsedQuantitySold).toFixed(2))
    const totalAmount = Number((parsedQuantitySold * parsedUnitPrice).toFixed(2))

    if (isSupabaseConfigured) {
      const { error: finishedGoodsError } = await supabase
        .from('finished_goods')
        .update({ quantity: updatedQuantityLeft })
        .eq('product_id', parsedProductId)

      if (finishedGoodsError) {
        return { ok: false, message: 'Could not update finished goods quantity in backend.' }
      }

      const { data: insertedSale, error: insertSaleError } = await supabase
        .from('sales')
        .insert([
          {
            product_id: parsedProductId,
            product_name: selectedProduct.productName,
            quantity_sold: parsedQuantitySold,
            unit_currency: selectedProduct.unitCurrency || 'USD',
            unit_price: parsedUnitPrice,
            total_amount: totalAmount,
            quantity_left: updatedQuantityLeft,
            sale_date: selectedSaleDate,
            created_at: saleTimestamp,
          },
        ])
        .select('*')
        .single()

      if (insertSaleError) {
        return { ok: false, message: 'Could not record sale in backend.' }
      }

      setSalesLogs((prevSales) => [mapSalesRecord(insertedSale), ...prevSales])
    } else {
      setSalesLogs((prevSales) => [
        {
          id: Date.now(),
          productId: parsedProductId,
          productName: selectedProduct.productName,
          quantitySold: parsedQuantitySold,
          unitCurrency: selectedProduct.unitCurrency || 'USD',
          unitPrice: parsedUnitPrice,
          totalAmount,
          quantityLeft: updatedQuantityLeft,
          saleDate: selectedSaleDate,
          createdAt: saleTimestamp,
        },
        ...prevSales,
      ])
    }

    setFinishedGoods((prevGoods) =>
      prevGoods.map((good) =>
        good.productId === parsedProductId
          ? {
              ...good,
              quantity: updatedQuantityLeft,
            }
          : good
      )
    )

    return {
      ok: true,
      message: `${parsedQuantitySold} unit(s) of ${selectedProduct.productName} sold successfully.`,
      summary: {
        productName: selectedProduct.productName,
        quantitySold: parsedQuantitySold,
        quantityLeft: updatedQuantityLeft,
        totalAmount,
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
  const totalSalesAmount = salesLogs.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)

  const value = {
    isSupabaseConfigured,
    isAuthenticated,
    isAuthLoading,
    currentUser,
    isBootstrapping,
    signup,
    login,
    logout,
    materials,
    products,
    productionLogs,
    salesLogs,
    stockPurchases,
    finishedGoods,
    lowStockMaterials,
    totalRawMaterials,
    totalFinishedGoods,
    totalProductionRuns,
    totalSalesAmount,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    configureProduct,
    deleteProduct,
    recordProduction,
    recordSale,
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
