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
            allotted_time INTEGER,
            description TEXT
        )
        `)

        await db.tx(t => {
            const queries = Object.entries(data).map(([name, power_armor]) =>
                t.none(
                    `INSERT INTO power_armor(name, base_cost, ac, dp, slots, load, allotted_time, description)
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
        console.error('Problem setting up power armor table:', error)
    }
}

async function setupPowerArmorUpgrades() {
    try {
        const data = JSON.parse(await fs.readFile('item-data/armor/power-armor-upgrades.json'))

        await db.none(`
            CREATE TABLE IF NOT EXISTS power_armor_upgrades (
                name TEXT PRIMARY KEY,
                base_cost INTEGER,
                description TEXT,
                ranks JSONB
            )
            `)

        await db.tx(t => {
            const queries = Object.entries(data).map(([name, upgrade]) =>
                t.none(
                    `INSERT INTO power_armor_upgrades(name, base_cost, description, ranks)
                    VALUES($1, $2, $3, $4)
                    ON CONFLICT (name) DO NOTHING`,
                    [name, upgrade.base_cost, upgrade.description, upgrade.ranks]
                )
            )
            return t.batch(queries)
        })

        console.log('Power Armor Upgrades Data inserted successfully!')
    } catch (error) {
        console.log("Problem setting up power armor upgrades table:", error)
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
        console.log("Problem setting up armor table:", error)
    }
}

async function setupArmorUpgrades() {
    try {
        var data = JSON.parse(await fs.readFile('item-data/armor/armor-upgrades.json'))

        db.none(`
            CREATE TABLE IF NOT EXISTS armor_upgrades (
                name TEXT PRIMARY KEY,
                base_cost INTEGER,
                description TEXT,
                ranks JSONB
            )
            `)

        db.tx(t => {
            const queries = Object.entries(data).map(([name, upgrade]) =>
                t.none(
                    `INSERT INTO armor_upgrades(name, base_cost, description, ranks)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (name) DO NOTHING`,
                    [name,
                        upgrade.base_cost,
                        upgrade.description,
                        upgrade.ranks]
                )
            )

            return t.batch(queries)
        })
        console.log('Armor Upgrades Data inserted successfully')
    } catch (error) {
        console.log("Problem setting up armor upgrades table:", error)

    }
}

setupArmor()
setupArmorUpgrades()
setupPowerArmor()
setupPowerArmorUpgrades()

function createArmorRoutes(tableName, baseRoute) {
    app.get(baseRoute, async (req, res) => {
        try {
            const items = await db.any(`SELECT * FROM ${tableName}`)
            res.json(items)
            console.log(`Sent ${tableName} data`)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: `Failed to fetch ${tableName} data` })
        }
    })

    app.get(`${baseRoute}/:name`, async (req, res) => {
        try {
            const { name } = req.params
            const item = await db.oneOrNone(`SELECT * FROM ${tableName} WHERE name = $1`, [name])
            if (!item) {
                return res.status(404).json({ error: `${name} not found` })
            }

            res.json(item)
            console.log(`Sent ${name} data from ${tableName}`)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: `Failed to fetch ${name} data` })
        }
    })
}

createArmorRoutes('armor', '/armor')
createArmorRoutes('armor_upgrades', '/armor_upgrades')
createArmorRoutes('power_armor', '/power_armor')
createArmorRoutes('power_armor_upgrades', '/power_armor_upgrades')


app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`)
})
