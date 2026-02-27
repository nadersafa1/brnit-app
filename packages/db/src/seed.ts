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
  nutrient: { number: string }
  amount?: number
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

const extractMacro = (
  nutrients: USDANutrient[],
  number: string,
): string | null => {
  const nutrient = nutrients.find((n) => n.nutrient.number === number)
  return nutrient?.amount !== undefined && nutrient.amount !== null
    ? String(nutrient.amount)
    : null
}

const main = async () => {
  console.log('🔗 Connecting to database...')
  const db = drizzle(process.env.DATABASE_URL!)

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

    for (let i = 0; i < foods.length; i += BATCH_SIZE) {
      const batch = foods.slice(i, i + BATCH_SIZE)
      const values = batch
        .filter((f) => f.foodCategory?.description)
        .map((f) => ({
          name: f.description,
          fdcId: f.fdcId,
          categoryId: categoryMap.get(f.foodCategory!.description)!,
          calories: extractMacro(f.foodNutrients, NUTRIENT_CALORIES),
          protein: extractMacro(f.foodNutrients, NUTRIENT_PROTEIN),
          carbs: extractMacro(f.foodNutrients, NUTRIENT_CARBS),
          fat: extractMacro(f.foodNutrients, NUTRIENT_FAT),
          servingSize: f.foodPortions?.[0]?.gramWeight
            ? String(f.foodPortions[0].gramWeight)
            : null,
        }))

      if (values.length > 0) {
        await db.insert(foodItem).values(values)
        inserted += values.length
      }
    }
    console.log(`✅ Inserted ${inserted} food items\n`)

    console.log('📊 Seeding Summary:')
    console.log(`   Categories: ${categoryNames.size}`)
    console.log(`   Food Items: ${inserted}`)
    console.log('\n🎉 Seed complete!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

main()
