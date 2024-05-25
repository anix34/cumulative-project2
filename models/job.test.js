"use strict";

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');
const Job = require('./job')

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require('./_testCommon.js')

beforeAll(commonBeforeAll)

beforeEach(commonBeforeEach)

afterEach(commonAfterEach)

afterAll(commonAfterAll)


describe('create a job', function () {
    const jobData = { title: 'testJob', salary: 1, equity: 0, companyHandle: 'c1' }

    test('given data create a job', async function () {
        const job = await Job.create(jobData)
        expect(job).toEqual(job)
    })
})

describe('get all jobs', function () {
    test('get jobs with all filters: title, minSalary & hasEquity', async function () {
        const jobs = await Job.getAll('j', 10, 'true')

        expect(jobs).toEqual([{ title: 'j2', salary: 20, equity: '0.008', company_handle: 'c2' }])
    })
    test('get jobs with filters: title, minSalary', async function () {
        const jobs = await Job.getAll('j', 5)

        expect(jobs).toEqual([
            { title: 'j1', salary: 10, equity: '0', company_handle: 'c1' },
            { title: 'j2', salary: 20, equity: '0.008', company_handle: 'c2' }
        ])
    })
    test('get jobs with no filters', async function () {
        const jobs = await Job.getAll()

        expect(jobs).toEqual([
            { title: 'j1', salary: 10, equity: '0', company_handle: 'c1' },
            { title: 'j2', salary: 20, equity: '0.008', company_handle: 'c2' }
        ])
    })
})

describe('get a single job', function () {

    test('works', async function () {
        const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`,
            ['j1'])

        const jobResultId = result.rows[0].id

        const job = await Job.get(jobResultId)

        expect(job).toEqual({ title: 'j1', salary: 10, equity: '0', company_handle: 'c1' })
    })
    test('invalid id', async function () {
        try {
            const job = await Job.get(999)

            expect(job).toEqual({ title: 'j1', salary: 10, equity: '0', company_handle: 'c1' })
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy()
        }
    })
})

describe('update a job', function () {
    test('works to update a job', async function () {

        const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`,
            ['j1'])

        const jobResultId = result.rows[0].id

        let job = await Job.update(jobResultId, { salary: 5, equity: 0.003 })

        expect(job).toEqual({ title: 'j1', salary: 5, equity: '0.003', company_handle: 'c1' })
    })

    test('err: no data provided', async function () {
        try {

            const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`,
                ['j1'])

            const jobResultId = result.rows[0].id

            await Job.update(jobResultId, {})
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy()
        }
    })
})

describe('delete a job', function () {
    test('works to delete a job', async function () {
        try {
            const result = await db.query(`
        SELECT id, title
        FROM jobs
        WHERE title = $1`,
                ['j1'])

            const jobResultId = result.rows[0].id

            const job = await Job.remove(jobResultId)
            expect(job).toEqual()

            await Job.get(jobResultId)
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy()
        }
    })
    test('not found if no such job', async function () {
        try {
            await Job.remove(999)
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy()
        }
    })
})