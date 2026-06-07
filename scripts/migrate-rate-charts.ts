import mongoose from 'mongoose'
import { RateChart } from '../src/models'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/milkcalc'

async function migrate() {
  console.log('Connecting to database:', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  
  console.log('Clearing existing RateCharts collection...')
  await RateChart.deleteMany({})

  console.log('Seeding default Cow Rate Chart...')
  await RateChart.create({
    chart_name: 'Cow Rate Chart',
    milk_type: 'cow',
    bonus_amount: 2.0,
    calculation_type: 'fat_snf_base_rate',
    status: 'active',
    is_default: true,
    cards: [
      {
        card_name: 'Standard Cow Card',
        fat_steps: [
          { min_val: 2.0, max_val: 3.4, rate: 30.00 },
          { min_val: 3.5, max_val: 4.5, rate: 35.00 },
          { min_val: 4.6, max_val: 6.0, rate: 40.00 }
        ],
        snf_steps: [
          { min_val: 7.5, max_val: 8.4, rate: 10.00 },
          { min_val: 8.5, max_val: 9.5, rate: 12.00 },
          { min_val: 9.6, max_val: 11.0, rate: 15.00 }
        ],
        fat_bonus: [
          { base_val: 4.0, bonus_rate: 0.10, penalty_rate: 0.15, step_size: 0.1 }
        ],
        snf_bonus: [
          { base_val: 8.5, bonus_rate: 0.12, penalty_rate: 0.20, step_size: 0.1 }
        ]
      }
    ]
  })

  console.log('Seeding default Buffalo Rate Chart...')
  await RateChart.create({
    chart_name: 'Buffalo Rate Chart',
    milk_type: 'buffalo',
    bonus_amount: 3.0,
    calculation_type: 'fat_snf_base_rate',
    status: 'active',
    is_default: true,
    cards: [
      {
        card_name: 'Standard Buffalo Card',
        fat_steps: [
          { min_val: 5.0, max_val: 6.4, rate: 45.00 },
          { min_val: 6.5, max_val: 8.0, rate: 52.00 },
          { min_val: 8.1, max_val: 10.0, rate: 60.00 }
        ],
        snf_steps: [
          { min_val: 8.0, max_val: 8.9, rate: 15.00 },
          { min_val: 9.0, max_val: 10.0, rate: 18.00 },
          { min_val: 10.1, max_val: 12.0, rate: 22.00 }
        ],
        fat_bonus: [
          { base_val: 7.0, bonus_rate: 0.15, penalty_rate: 0.20, step_size: 0.1 }
        ],
        snf_bonus: [
          { base_val: 9.0, bonus_rate: 0.18, penalty_rate: 0.25, step_size: 0.1 }
        ]
      }
    ]
  })

  console.log('Seeding Festival Special Rate Chart (Inactive by default)...')
  await RateChart.create({
    chart_name: 'Festival Rate Chart',
    milk_type: 'mixed',
    bonus_amount: 5.0,
    calculation_type: 'fat_snf',
    status: 'inactive',
    is_default: false,
    cards: [
      {
        card_name: 'Festival Card',
        fat_steps: [
          { min_val: 2.0, max_val: 10.0, rate: 45.00 }
        ],
        snf_steps: [
          { min_val: 7.0, max_val: 12.0, rate: 20.00 }
        ],
        fat_bonus: [],
        snf_bonus: []
      }
    ]
  })

  console.log('Database seeded successfully with default Rate Charts!')
  await mongoose.disconnect()
}

migrate().catch(console.error)
