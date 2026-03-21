import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { reset } from 'drizzle-seed'
import { readFileSync } from 'node:fs'
import { foodCategory } from './schema/food-category'
import { foodItem } from './schema/food-item'
import { meal, mealItem } from './schema/meal'
import { dietPlan, dietPlanMeal } from './schema/diet-plan'

dotenv.config({ path: '../../apps/web/.env' })

const USDA_JSON_PATH =
  '/Users/nadersafa/Downloads/FoodData_Central_foundation_food_json_2025-12-18.json'

const NUTRIENT_PROTEIN = '203'
const NUTRIENT_CARBS = '205'
const NUTRIENT_FAT = '204'
const NUTRIENT_CALORIES = '208'

interface USDANutrient {
  nutrient?: { number?: string | number | null } | null
  nutrientNumber?: string | number | null
  number?: string | number | null
  amount?: number
  value?: number
}

interface USDAFoodPortion {
  gramWeight?: number
}

interface USDAFoodItem {
  fdcId: number
  description: string
  foodCategory?: { description: string }
  foodNutrients: USDANutrient[]
  foodPortions?: USDAFoodPortion[]
}

interface USDAData {
  FoundationFoods: USDAFoodItem[]
}

const USDA_API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'
const USDA_REQUEST_TIMEOUT_MS = 10000
const USDA_MAX_RETRIES = 3

const usdaNutrientsCache = new Map<number, USDANutrient[]>()
const usdaSearchNutrientsCache = new Map<string, USDANutrient[] | null>()

const extractMacro = (
  nutrients: USDANutrient[],
  number: string,
): string | null => {
  const nutrient = nutrients.find((n) => {
    const nutrientNumber = n.nutrient?.number ?? n.nutrientNumber ?? n.number
    return nutrientNumber != null && String(nutrientNumber) === number
  })
  const amount = nutrient?.amount ?? nutrient?.value
  return amount !== undefined && amount !== null ? String(amount) : null
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const parseRetryAfterMs = (retryAfter: string | null): number | null => {
  if (!retryAfter) return null

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000)

  const dateMs = Date.parse(retryAfter)
  if (Number.isNaN(dateMs)) return null
  const deltaMs = dateMs - Date.now()
  return deltaMs > 0 ? deltaMs : null
}

const countAvailableMacros = (nutrients: USDANutrient[]): number => {
  let count = 0
  if (extractMacro(nutrients, NUTRIENT_CALORIES) !== null) count += 1
  if (extractMacro(nutrients, NUTRIENT_PROTEIN) !== null) count += 1
  if (extractMacro(nutrients, NUTRIENT_CARBS) !== null) count += 1
  if (extractMacro(nutrients, NUTRIENT_FAT) !== null) count += 1
  return count
}

const fetchUSDAFoodNutrientsByFdcId = async (
  fdcId: number,
  apiKey: string,
): Promise<USDANutrient[] | null> => {
  const cached = usdaNutrientsCache.get(fdcId)
  if (cached) return cached

  for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), USDA_REQUEST_TIMEOUT_MS)

    try {
      const url = `${USDA_API_BASE_URL}/food/${fdcId}?api_key=${encodeURIComponent(
        apiKey,
      )}&format=abridged`
      const response = await fetch(url, { signal: controller.signal })

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        const backoffMs = retryAfterMs ?? attempt * 1000
        console.warn(
          `⚠️  USDA rate-limited for fdcId=${fdcId} (attempt ${attempt}/${USDA_MAX_RETRIES}); retrying in ${backoffMs}ms`,
        )
        if (attempt < USDA_MAX_RETRIES) {
          await sleep(backoffMs)
          continue
        }
        return null
      }

      if (!response.ok) {
        console.warn(
          `⚠️  USDA request failed for fdcId=${fdcId} with status ${response.status}`,
        )
        return null
      }

      const body = (await response.json()) as { foodNutrients?: USDANutrient[] }
      const nutrients = Array.isArray(body.foodNutrients) ? body.foodNutrients : []
      usdaNutrientsCache.set(fdcId, nutrients)
      return nutrients
    } catch (error) {
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      console.warn(
        `⚠️  USDA request error for fdcId=${fdcId} (attempt ${attempt}/${USDA_MAX_RETRIES}): ${
          isAbortError ? 'timeout' : 'request failed'
        }`,
      )
      if (attempt < USDA_MAX_RETRIES) {
        await sleep(attempt * 1000)
        continue
      }
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}

const fetchUSDAFoodNutrientsByDescription = async (
  description: string,
  apiKey: string,
): Promise<USDANutrient[] | null> => {
  const query = description.trim().toLowerCase()
  const cached = usdaSearchNutrientsCache.get(query)
  if (cached !== undefined) return cached

  for (let attempt = 1; attempt <= USDA_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), USDA_REQUEST_TIMEOUT_MS)

    try {
      const url = `${USDA_API_BASE_URL}/foods/search?api_key=${encodeURIComponent(
        apiKey,
      )}&query=${encodeURIComponent(description)}&pageSize=10`
      const response = await fetch(url, { signal: controller.signal })

      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        const backoffMs = retryAfterMs ?? attempt * 1000
        if (attempt < USDA_MAX_RETRIES) {
          await sleep(backoffMs)
          continue
        }
        usdaSearchNutrientsCache.set(query, null)
        return null
      }

      if (!response.ok) {
        usdaSearchNutrientsCache.set(query, null)
        return null
      }

      const body = (await response.json()) as {
        foods?: Array<{
          dataType?: string
          foodNutrients?: USDANutrient[]
        }>
      }

      const foods = Array.isArray(body.foods) ? body.foods : []
      const nonBranded = foods.filter((food) => food.dataType !== 'Branded')
      const candidates = nonBranded.length > 0 ? nonBranded : foods

      let best: USDANutrient[] | null = null
      let bestScore = -1
      for (const candidate of candidates) {
        const nutrients = Array.isArray(candidate.foodNutrients)
          ? candidate.foodNutrients
          : []
        const score = countAvailableMacros(nutrients)
        if (score > bestScore) {
          best = nutrients
          bestScore = score
        }
      }

      const result = bestScore > 0 ? best : null
      usdaSearchNutrientsCache.set(query, result)
      return result
    } catch {
      if (attempt < USDA_MAX_RETRIES) {
        await sleep(attempt * 1000)
        continue
      }
      usdaSearchNutrientsCache.set(query, null)
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  usdaSearchNutrientsCache.set(query, null)
  return null
}

const main = async () => {
  console.log('🔗 Connecting to database...')
  const db = drizzle(process.env.DATABASE_URL!)
  const usdaApiKey = process.env.USDA_API_KEY

  const dietSchema = {
    foodCategory,
    foodItem,
    meal,
    mealItem,
    dietPlan,
    dietPlanMeal,
  }

  try {
    console.log('🗑️  Resetting diet-related tables...')
    await reset(db, dietSchema)
    console.log('✅ Reset complete\n')

    console.log('📖 Reading USDA JSON...')
    const raw = readFileSync(USDA_JSON_PATH, 'utf-8')
    const data: USDAData = JSON.parse(raw)
    const foods = data.FoundationFoods
    console.log(`   Found ${foods.length} food items\n`)

    const categoryNames = new Set<string>()
    for (const food of foods) {
      if (food.foodCategory?.description) {
        categoryNames.add(food.foodCategory.description)
      }
    }
    console.log(`📁 Inserting ${categoryNames.size} categories...`)

    const categoryMap = new Map<string, string>()
    for (const name of categoryNames) {
      const result = await db
        .insert(foodCategory)
        .values({ name })
        .returning({ id: foodCategory.id })
      const insertedCategory = result[0]
      if (insertedCategory) {
        categoryMap.set(name, insertedCategory.id)
      }
    }
    console.log('✅ Categories inserted\n')

    console.log(`🍎 Inserting ${foods.length} food items...`)
    const BATCH_SIZE = 100
    let inserted = 0
    let foodsWithAnyMissing = 0
    let fieldsFilledViaApi = 0
    let fieldsFilledViaSearch = 0
    let remainingNullFields = 0

    for (let i = 0; i < foods.length; i += BATCH_SIZE) {
      const batch = foods.slice(i, i + BATCH_SIZE)
      const values = []

      for (const f of batch) {
        if (!f.foodCategory?.description) continue

        let calories = extractMacro(f.foodNutrients, NUTRIENT_CALORIES)
        let protein = extractMacro(f.foodNutrients, NUTRIENT_PROTEIN)
        let carbs = extractMacro(f.foodNutrients, NUTRIENT_CARBS)
        let fat = extractMacro(f.foodNutrients, NUTRIENT_FAT)

        const missingBefore = [calories, protein, carbs, fat].filter((value) => value === null)
          .length

        if (missingBefore > 0) {
          foodsWithAnyMissing += 1

          if (usdaApiKey) {
            const apiNutrients = await fetchUSDAFoodNutrientsByFdcId(f.fdcId, usdaApiKey)
            if (apiNutrients) {
              if (!calories) calories = extractMacro(apiNutrients, NUTRIENT_CALORIES)
              if (!protein) protein = extractMacro(apiNutrients, NUTRIENT_PROTEIN)
              if (!carbs) carbs = extractMacro(apiNutrients, NUTRIENT_CARBS)
              if (!fat) fat = extractMacro(apiNutrients, NUTRIENT_FAT)
            }

            const missingAfterFdcLookup = [calories, protein, carbs, fat].filter(
              (value) => value === null,
            ).length
            if (missingAfterFdcLookup > 0) {
              const searchNutrients = await fetchUSDAFoodNutrientsByDescription(
                f.description,
                usdaApiKey,
              )
              if (searchNutrients) {
                const beforeSearch = [calories, protein, carbs, fat].filter((value) => value === null)
                  .length
                if (!calories) calories = extractMacro(searchNutrients, NUTRIENT_CALORIES)
                if (!protein) protein = extractMacro(searchNutrients, NUTRIENT_PROTEIN)
                if (!carbs) carbs = extractMacro(searchNutrients, NUTRIENT_CARBS)
                if (!fat) fat = extractMacro(searchNutrients, NUTRIENT_FAT)
                const afterSearch = [calories, protein, carbs, fat].filter((value) => value === null)
                  .length
                fieldsFilledViaSearch += beforeSearch - afterSearch
              }
            }
          }
        }

        const missingAfter = [calories, protein, carbs, fat].filter((value) => value === null)
          .length
        fieldsFilledViaApi += missingBefore - missingAfter
        remainingNullFields += missingAfter

        values.push({
          name: f.description,
          fdcId: f.fdcId,
          categoryId: categoryMap.get(f.foodCategory.description)!,
          calories,
          protein,
          carbs,
          fat,
          servingSize: f.foodPortions?.[0]?.gramWeight
            ? String(f.foodPortions[0].gramWeight)
            : '100',
          unit: '100g' as const,
          gramsPerUnit: '100',
        })
      }

      if (values.length > 0) {
        await db.insert(foodItem).values(values)
        inserted += values.length
      }
    }
    console.log(`✅ Inserted ${inserted} food items\n`)

    console.log('📊 Seeding Summary:')
    console.log(`   Categories: ${categoryNames.size}`)
    console.log(`   Food Items: ${inserted}`)
    console.log(`   Foods with missing macros before fallback: ${foodsWithAnyMissing}`)
    console.log(`   Macro fields filled from USDA API (fdcId): ${fieldsFilledViaApi}`)
    console.log(`   Macro fields filled from USDA API (name search): ${fieldsFilledViaSearch}`)
    console.log(`   Remaining null macro fields: ${remainingNullFields}`)
    console.log('\n🎉 Seed complete!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
