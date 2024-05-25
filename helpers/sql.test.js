const { sqlForPartialUpdate } = require('./sql')
const { BadRequestError } = require('../expressError')


describe('sql query to partially update', function () {
    test('works when data from patch request is passed into function', () => {
        const dataToUpdate = { password: 'tammy123', firstName: 'Tammyz', lastName: 'Smitheroo!' }
        const jsonToSql = {
            firstName: "first_name",
            lastName: "last_name",
            isAdmin: "is_admin",
        }
        const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsonToSql)

        expect({ setCols, values }).toEqual({
            setCols: `"password"=$1, "first_name"=$2, "last_name"=$3`,
            values: ['tammy123', 'Tammyz', 'Smitheroo!']
        })
    })

    test('user did not provide data/body to update values in the Patch request', function () {
        try {
            const dataToUpdate = {}
            const jsonToSql = {
                firstName: "first_name",
                lastName: "last_name",
                isAdmin: "is_admin",
            }

            sqlForPartialUpdate(dataToUpdate, jsonToSql)
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy()
        }
    })
})