"use strict";

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');


class Job {
    /**Create a job from data, add to db, return new job data.
     * 
     * Data should be: {title, salary, equity, companyHandle}
     * 
     * Returns: {title, salary, equity, companyHandle}
     * 
     * Throws BadRequestError if job already exists
     */

    static async create({ title, salary, equity, companyHandle }) {
        const result = await db.query(`
        INSERT INTO jobs (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [title, salary, equity, companyHandle])

        const job = result.rows[0]

        return job
    }

    /** Get all jobs or filtered jobs
     * 
     * Filter options through query strings: 
     * title, minSalary or hasEquity
     * 
     * Returns: [{title, salary, equity, company_handle}...]
     *
     */
    static async getAll(title = null, minSalary = null, hasEquity = null) {

        let sqlQuery = `SELECT title, salary, equity, company_handle AS "companyHandle"
        FROM jobs`

        let sqlQueryVariableValues


        if (title && minSalary && hasEquity === 'true') {
            sqlQuery = sqlQuery + `
            WHERE salary >= $1 AND equity > $2 AND title ILIKE '%'||$3||'%'
            ORDER BY title`

            sqlQueryVariableValues = [minSalary, 0, title]
        }
        else if (minSalary && hasEquity === 'true') {
            sqlQuery = sqlQuery + `
            WHERE salary >= $1 AND equity > $2 ORDER BY title`

            sqlQueryVariableValues = [minSalary, 0]
        }
        else if (title && minSalary) {
            sqlQuery = sqlQuery + `
            WHERE salary >= $1 AND title 
            ILIKE '%'||$2||'%' 
            ORDER BY title`

            sqlQueryVariableValues = [minSalary, title]
        }
        else if (title && hasEquity === 'true') {
            sqlQuery = sqlQuery + `
            WHERE equity > $1 AND title 
            ILIKE '%'||$2||'%' 
            ORDER BY title`

            sqlQueryVariableValues = [0, title]
        }
        else if (minSalary) {
            sqlQuery = sqlQuery + `
            WHERE salary >= $1 ORDER BY title`

            sqlQueryVariableValues = [minSalary]
        }
        else if (hasEquity === 'true') {
            sqlQuery = sqlQuery + `
            WHERE equity > $1 ORDER BY title`

            sqlQueryVariableValues = [0]
        }
        else if (title) {
            sqlQuery = sqlQuery + `
            WHERE title ILIKE '%'||$1||'%' ORDER BY title`

            sqlQueryVariableValues = [title]
        }

        const result = await db.query(sqlQuery, sqlQueryVariableValues)

        const jobs = result.rows

        if (!result.rows[0]) throw new BadRequestError('No jobs found')

        return jobs
    }

    /** To get a single job's information when provided with the job's id.
     * 
     * Returns: {title, salary, equity, company_handle}
     * 
     * Throws NotFoundError if job is not found}
     */
    static async get(id) {

        const result = await db.query(`
        SELECT title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
            [id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)

        return job
    }

    /** Update job data with 'data'
   * This is a "partial update" --- it's fine if data doesn't contain all
   *  the fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
    */
    static async update(id, data) {

        const { cols, values } = sqlForPartialUpdate(
            data,
            {
                title: 'title',
                salary: 'salary',
                equity: 'equity'
            })

        const idVariableIdx = '$' + (values.length + 1)

        const sqlQuery = `UPDATE jobs
                          SET ${cols} 
                          WHERE id = ${idVariableIdx}  
                          RETURNING title, salary, equity, company_handle AS "companyHandle"`

        const result = await db.query(sqlQuery, [...values, id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)

        return job
    }

    /**Delete a job
     * 
     * Requires: id
     * 
     * Returns undefined
     * 
     * If job not found, throw NotFoundError
     */
    static async remove(id) {
        const result = await db.query(`
        DELETE FROM jobs
        WHERE id = $1
        RETURNING id`,
            [id])

        const job = result.rows[0]

        if (!job) throw new NotFoundError(`No job found with id of ${id}`)
    }
}

module.exports = Job