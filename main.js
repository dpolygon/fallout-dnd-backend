const express = require('express')
const pgp = require('pg-promise')()
const fs = require('fs/promises')
const dotenv = require('dotenv')
const app = express()
const port = 3000

dotenv.config() // loads variables from .env file

const db = pgp(`postgres://shinyeared:pichu@localhost:5431/fallout`)

async function setupPowerArmor() {
    try {
        const data = JSON.parse(await fs.readFile('item-data/armor/power-armor.json', 'utf8'))
        
        await db.none(`
        CREATE TABLE IF NOT EXISTS power_armor (
            name TEXT PRIMARY KEY,
            base_cost INTEGER,
            ac INTEGER,
            dp INTEGER,
            slots INTEGER,
            load INTEGER,
            alloted_time INTEGER,
            description TEXT
        )
        `)

        await db.tx(t => {
            const queries = Object.entries(data).map(([name, power_armor]) =>
                t.none(
                    `INSERT INTO power_armor(name, base_cost, ac, dp, slots, load, alloted_time, description)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
                    ON CONFLICT (name) DO NOTHING`,
                    [name,
                        power_armor.base_cost,
                        power_armor.AC,
                        power_armor.DP,
                        power_armor.slots,
                        power_armor.load,
                        power_armor.allotted_time,
                        power_armor.desc
                    ]
                )
            )
            return t.batch(queries)
        })

        console.log('Data inserted successfully!')
    } catch (error) {
        console.error('Error setting up database:', error)
    }
}

setupPowerArmor()

app.get('/power_armor', async (req, res) => {
    try {
        const armors = await db.any('SELECT * FROM power_armor');
        res.json(armors);  // send JSON response
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch power armor data' });
    }
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`)
})
