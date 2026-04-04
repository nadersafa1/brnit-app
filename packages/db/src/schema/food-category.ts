import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const foodCategory = pgTable('food_category', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
