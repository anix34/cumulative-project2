const { BadRequestError } = require("../expressError");

//To partially update a user, company or job in the database
//
//dataToUpdate =  the data/body of what the user would like to update
//
//jsToSql = changes the key-names into names that match the columns names in db
//
//Returns the SET (columns of the table) and the VALUES (new values) 
//that will be placed into the UPDATE SQL query
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);

  if (keys.length === 0) throw new BadRequestError("No data");

  const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    cols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };