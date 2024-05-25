"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies. 
   * Query strings: name, minEmployees, and maxEmployees are optional filtering options)
   * 
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(name = null, minEmployees = null, maxEmployees = null) {
    let minEmployeesNum
    let maxEmployeesNum

    if (minEmployees) {
      minEmployeesNum = parseInt(minEmployees)
      if (maxEmployees) {
        maxEmployeesNum = parseInt(maxEmployees)
        if (minEmployeesNum > maxEmployeesNum) {
          throw new BadRequestError(`Mininum employees ${minEmployeesNum} cannot be greater than maximum employees ${maxEmployeesNum}`)
        }
      }
    }

    if (maxEmployees) {
      maxEmployeesNum = parseInt(maxEmployees)
    }

    //have name, minEmployees, maxEmployees query strings
    if (name != null && minEmployeesNum != null && maxEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees >= $1 AND num_employees <= $2 AND name 
      ILIKE '%'||$3||'%'
      ORDER BY name`,
        [minEmployeesNum, maxEmployeesNum, name])

      return companiesRes.rows
    }

    //minEmployees and maxEmployees only
    if (minEmployeesNum != null && maxEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees >= $1 AND num_employees <= $2
      ORDER BY name`,
        [minEmployeesNum, maxEmployeesNum])

      return companiesRes.rows
    }

    //name and minEmployees only
    if (name != null && minEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees >= $1 AND name 
      ILIKE '%'||$2||'%'
      ORDER BY name`,
        [minEmployeesNum, name])

      return companiesRes.rows
    }

    //name and maxEmployees only
    if (name != null && maxEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees <= $1 AND name 
      ILIKE '%'||$2||'%'
      ORDER BY name`,
        [maxEmployeesNum, name])

      return companiesRes.rows
    }

    //name only 
    if (name) {
      const companiesRes = await db.query(
        `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE name
           ILIKE '%'||$1||'%'
           ORDER BY name`,
        [name]);
      return companiesRes.rows;
    }

    //minEmployees only
    if (minEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees >= $1 
      ORDER BY name`,
        [minEmployeesNum])

      return companiesRes.rows
    }

    //maxEmployees only
    if (maxEmployeesNum != null) {
      const companiesRes = await db.query(`
      SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees", 
                logo_url AS "logoUrl"
      FROM companies
      WHERE num_employees <= $1 
      ORDER BY name`,
        [maxEmployeesNum])

      return companiesRes.rows
    }

    //no query strings at all
    const companiesRes = await db.query(
      `SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url AS "logoUrl"
       FROM companies
       ORDER BY name`);
    return companiesRes.rows;
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    let companyRes = await db.query(
      `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
             FROM companies
             WHERE handle = $1`, [handle]);

    let company = companyRes.rows[0];


    const jobsRes = await db.query(`
    SELECT id, title, salary, equity
    FROM jobs
    WHERE company_handle = $1`, [handle])

    const jobsArr = jobsRes.rows

    company.jobs = jobsArr


    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
  *
  * This is a "partial update" --- it's fine if data doesn't contain all the
  * fields; this only changes provided ones.
  *
  * Data can include: {name, description, numEmployees, logoUrl}
  *
  * Returns {handle, name, description, numEmployees, logoUrl}
  *
  * Throws NotFoundError if not found.
  */

  static async update(handle, data) {

    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });

    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;

    const result = await db.query(querySql, [...values, handle]);

    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);

    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;