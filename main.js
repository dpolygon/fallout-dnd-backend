const express = require('express')
const pgp = require('pg-promise')()
const fs = require('fs/promises')
const dotenv = require('dotenv')
const cors = require('cors')
const { arrayBuffer } = require('stream/consumers')
const app = express()
const port = 3000

dotenv.config() // loads variables from .env file
const corsOptions = {
    origin: 'http://localhost:5173', // Replace with your client's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

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

        console.log('Power Armor Data inserted successfully!')
    } catch (error) {
        console.error('Problem setting up power armor tables:', error)
    }
}

async function setupArmor() {
    try {
        const data = JSON.parse(await fs.readFile('item-data/armor/armor.json', 'utf8'))

        await db.none(`
            CREATE TABLE IF NOT EXISTS armor (
                name TEXT PRIMARY KEY,
                base_cost INTEGER,
                ac INTEGER,
                dt INTEGER,
                slots INTEGER,
                load INTEGER,
                str_requirement INTEGER,
                description TEXT
            )
        `)

        await db.tx(t => {
            const queries = Object.entries(data).map(([name, armor]) =>
                t.none(
                    `INSERT INTO armor(name, base_cost, ac, dt, slots, load, str_requirement, description)
                    VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
                    ON CONFLICT (name) DO NOTHING`,
                    [name,
                        armor.base_cost,
                        armor.AC,
                        armor.DT,
                        armor.slots,
                        armor.load,
                        armor.str_requirement,
                        armor.desc
                    ]
                )
            )
            return t.batch(queries)
        })

        console.log('Armor Data inserted successfully!')
    } catch (error) {
        console.log("Problem setting up armor tables:", error)
    }
}

setupArmor()
setupPowerArmor()

app.get('/armor', async (req, res) => {
    try {
        const armors = await db.any('SELECT * FROM armor')
        res.json(armors)
        console.log('sent armor data')
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Failed to fetch armor data' })
    }
})

app.get('/power_armor', async (req, res) => {
    try {
        const armors = await db.any('SELECT * FROM power_armor')
        res.json(armors);  // send JSON response
        console.log('Sent power armor data')
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch power armor data' });
    }
})

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`)
})
