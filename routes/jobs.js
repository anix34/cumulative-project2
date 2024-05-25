const jsonschema = require('jsonschema')
const express = require('express')

const { BadRequestError } = require('../expressError')
const { ensureAdminLoggedIn } = require('../middleware/auth')
const Job = require('../models/job')
const db = require('../db')

const jobNewSchema = require('../schemas/jobNew.json')
const jobUpdateSchema = require('../schemas/jobUpdate.json')
const jobSearchSchema = require('../schemas/jobSearch.json')

const router = new express.Router()


/** POST '/'. Creates a new company 
 * 
 * data: { job} =>  { job }
 *
 * job should be: { title, salary, equity, companyHandle }
 *
 * Returns {job: { title, salary, equity, companyHandle }}
 *
 * Authorization required: login
 * 
 * Only title and companyHandle are needed
 */
router.post('/', ensureAdminLoggedIn, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema)

        if (!validator.valid) {
            const errors = validator.errors.map(obj => obj.stack)
            throw new BadRequestError(errors)
        }

        const job = await Job.create(req.body)

        return res.status(201).json({ job })
    } catch (e) {
        return next(e)
    }
})

/** GET '/' = Gets all jobs or filtered jobs
 *  
 *Optional search filters:  
 title  (will find case-insensitive, partial title matches)
 minSalary
 hasEquity

 * Returns: {jobs: [{ title, minSalary, hasEquity, companyHandle}]}

 Authorization not required
 */
router.get('/', async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobSearchSchema)

        if (!validator.valid) {
            const errors = validator.errors.map(obj => obj.stack)
            throw new BadRequestError(errors)
        }

        const { title, minSalary, hasEquity } = req.query

        const jobs = await Job.getAll(title, minSalary, hasEquity)

        return res.json({ jobs })
    } catch (e) {
        return next(e)
    }
})

/** GET '/:id' => to get data about a single job
 * 
 * Returns: {job: {title, salary, equity, company_handle}}
 * 
 * Authorization not required
 */
router.get('/:id', async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id)

        return res.json({ job })
    } catch (e) {
        return next(e)
    }
})

/** PATCH '/:id' = to update a single job
 * 
 * Data can include: {title, salary, equity}
 * 
 * Returns: {job: {title, salary, equity, companyHandle}}
 * 
 * Authorization: Log in and only Admin can update job
 */
router.patch('/:id', ensureAdminLoggedIn, async function (req, res, next) {
    try {
        const validate = jsonschema.validate(req.body, jobUpdateSchema)

        if (!validate.valid) {
            const errors = validate.errors.map(e => e.stack)
            throw new BadRequestError(errors)
        }

        const job = await Job.update(req.params.id, req.body)

        return res.json({ job })
    } catch (e) {
        return next(e)
    }
})

/**DELETE '/:id' = delete a job
 * 
 * Requires: id
 * 
 * Returns { deleted: id })
 * 
 * Authorization: Log in and only Admin can delete job
 */
router.delete('/:id', ensureAdminLoggedIn, async function (req, res, next) {
    try {
        await Job.remove(req.params.id)

        return res.json({ deleted: `${req.params.id}` })
    } catch (e) {
        return next(e)
    }
})

module.exports = router