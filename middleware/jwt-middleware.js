const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

async function jwtMiddleware(req, res, next) {
	const token = req.header('x-access-token');
	if (!token) return res.status(401).json('No token provided');

	try {
		const decoded = jwt.verify(token, secret);
		req.user = decoded;
		next();
	} catch (error) {
		res.status(500).json(error);
	}
}

module.exports = {
	jwtMiddleware,
};
