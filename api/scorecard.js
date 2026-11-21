const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow','GET');
    return res.status(405).end();
  }
  const db = new DatabaseSync(path.join(__dirname,'../data/scorecard.sqlite'), {readOnly:true});
  try {
    const rows = db.prepare('SELECT * FROM district_score ORDER BY score DESC, name').all();
    const districts = Object.fromEntries(rows.map(row=>[row.name,{score:row.score,categories:JSON.parse(row.categories)}]));
    res.setHeader('Cache-Control','public, s-maxage=3600');
    return res.status(200).json({updatedAt:rows[0].updated_at,districts});
  } finally {
    db.close();
  }
};
