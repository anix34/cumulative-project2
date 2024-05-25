const request = require('supertest')

const db = require('../db')
const app = require('../app')

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u2Token
} = require('./_testCommon')
const { BadRequestError, NotFoundError, UnauthorizedError } = require('../expressError')

beforeAll(commonBeforeAll)
beforeEach(commonBeforeEach)
afterEach(commonAfterEach)
afterAll(commonAfterAll)

/***POST '/jobs'*******************************/

describe('POST /jobs', function () {
    const data = {
        title: 'testJob',
        salary: 1,
        equity: 0,
        companyHandle: 'c1'
    }

    test('create job if Admin', async function () {
        const res = await request(app).post('/jobs')
            .send(data)
            .set('Authorization', `Bearer ${u2Token}`)

        expect(res.statusCode).toEqual(201)
        expect(res.body).toEqual({
            job: {
                title: 'testJob',
                salary: 1,
                equity: '0',
                companyHandle: 'c1'
            }
        })
    })

    test('cannot create job if not Admin', async function () {
        const res = await request(app).post('/jobs')
            .send(data)
            .set('Authorization', `Bearer ${u1Token}`)

        expect(res.statusCode).toEqual(401)
    })

    test('no data and is Admin', async function () {
        const res = await request(app).post('/jobs')
            .send({})
            .set('Authorization', `Bearer ${u2Token}`)

        expect(res.statusCode).toEqual(400)
    })
})

describe("GET '/jobs'", function () {
    test('get jobs with filters: title, salary & equity', async function () {

        const resp = await request(app).get(`/jobs?title=j&minSalary=10&hasEquity=true`)

        expect(resp.statusCode).toBe(200)
        expect(resp.body).toEqual({
            jobs: [{ title: 'j2', salary: 20, equity: '0.002', companyHandle: 'c2' }]
        })
    })

    test('get jobs with filter: title', async function () {

        const resp = await request(app).get(`/jobs?title=j`)

        expect(resp.statusCode).toBe(200)
        expect(resp.body).toEqual({
            jobs: [{ title: "j1", salary: 10, equity: '0', companyHandle: "c1" },
            { title: 'j2', salary: 20, equity: '0.002', companyHandle: 'c2' }]
        })
    })

    test('get jobs with no filters', async function () {

        const resp = await request(app).get(`/jobs`)

        expect(resp.statusCode).toBe(200)
        expect(resp.body).toEqual({
            jobs: [{ title: "j1", salary: 10, equity: '0', companyHandle: "c1" },
            { title: 'j2', salary: 20, equity: '0.002', companyHandle: 'c2' }]
        })
    })
    test('get jobs with no filters', async function () {
        try {
            await request(app).get(`/jobs?title=hat`)
        } catch (e) {
            expect(e instanceof BadRequestError().toBeTruthy())
        }
    })
})

describe("GET '/jobs/id'", function () {
    test('get job with valid id', async () => {
        const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`, ['j1'])

        const id = result.rows[0].id

        const resp = await request(app).get(`/jobs/${id}`)
        expect(resp.body).toEqual({
            job: {
                title: 'j1', salary: 10, equity: '0', companyHandle: 'c1'
            }
        })
    })
    test('get job with invalid id', async () => {
        try {
            const resp = await request(app).get(`/jobs/999`)
        } catch (e) {
            expect(e instanceof NotFoundError().toBeTruthy())
        }
    })
})

describe('PATCH /jobs/id', () => {
    test('update title, salary and equity for a job', async () => {
        const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`, ['j1'])

        const id = result.rows[0].id

        const data = { title: 'testJob', salary: 50, equity: 0.09 }

        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send(data)
            .set('Authorization', `Bearer ${u2Token}`)

        expect(resp.body).toEqual({
            job: {
                title: 'testJob', salary: 50, equity: '0.09', companyHandle: 'c1'
            }
        })
    })
    test('bad data. test validation.', async () => {
        try {
            const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`, ['j1'])

            const id = result.rows[0].id

            const data = { salary: '50' }

            const resp = await request(app)
                .patch(`/jobs/${id}`)
                .send(data)
                .set('Authorization', `Bearer ${u2Token}`)
        } catch (e) {
            expect(e instanceof BadRequestError().toBeTruthy())
        }
    })
    test('not Admin cannot update job', async () => {
        try {
            const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`, ['j1'])

            const id = result.rows[0].id

            const data = { salary: 50 }

            const resp = await request(app)
                .patch(`/jobs/${id}`)
                .send(data)
                .set('Authorization', `Bearer ${u1Token}`)
        } catch (e) {
            expect(e instanceof UnauthorizedError().toBeTruthy())
        }
    })
})

describe('DELETE /jobs/:id', () => {
    test('delete a job if Admin', async () => {
        const result = await db.query(`
            SELECT id, title
            FROM jobs
            WHERE title = $1`, ['j1'])

        const id = result.rows[0].id

        const resp = await request(app).delete(`/jobs/${id}`).s
        et('Authorization', u2Token)
        expect(resp.statusCode).toEqual(200)
        expect(resp.body).toEqual({ deleted: `${id}` })
    })

    test('cannot delete a job if not Admin', async () => {
        try {
            const result = await db.query(`
            SELECT id, title
            FROM jobs
            WHERE title = $1`, ['j1'])

            const id = result.rows[0].id

            const resp = await request(app)
                .delete(`/jobs/${id}`)
                .set('Authorization', u1Token)
        } catch (e) {
            expect(e instanceof UnauthorizedError().toBeTruthy())
        }
    })

    test('cannot delete a job with invalid id', async () => {
        try {
            await request(app)
                .delete(`/jobs/999`)
                .set('Authorization', u2Token)
        } catch (e) {
            expect(e instanceof BadRequestError().toBeTruthy())
        }
    })
})