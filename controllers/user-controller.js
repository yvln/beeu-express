const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');

const Auth 		= require('../services/auth');
const User 		= require('../models/user');

// Authentication

router.get('/validate',
	Auth.restrict,
	(req, res) => {
	  res.json({
			fname: req.user.fname,
			lname: req.user.lname,
	    email: req.user.email,
	    token: req.user.token,
	    id: req.user.id
	  })
});

router.post('/signup', (req, res) => {
  const email = req.body.email.toLowerCase();
  const {fname, lname, username, password, password_confirmation, picture} = req.body;
	const errors = {
		fname: [],
		lname: [],
		email: [],
    username: [],
    password: [],
    password_confirmation: []
  };
  let error = false;
	Object.keys(errors).forEach( key => {
		if( !req.body[key] ){
      errors[key].push(`${key} is required`);
      error = true;
    }
  })
  if (password !== password_confirmation){
    errors.password_confirmation.push("Password does not match confirmation.");
    error = true;
  }
  let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!re.test(email)){
    errors.email.push("Not a valid email address.");
    error = true;
  }
	User.findByEmail(email)
		.then( resp => {
			if ( resp !== null ) {
				errors.email.push("Email address already taken");
				error = true;
			}
			if (!error){
				const { email, fname, lname, username, picture } = req.body
				let date = '';
				const year = new Date().getFullYear();
				const month = new Date().getMonth()+1;
				const day = new Date().getDate();
				date = `${year}-${month}-${day}`;
		    User
		      .generateToken(User.create, fname, lname, email, username, date, 0, 0, 0, 0, 0, 0, password, 1, 15, picture)
		      .then(data => {
		        res.json(data)
		      }).catch(err => {
						console.log(err);
						res.status(400).json({ error: {errors} });
					})
		  } else {
		    res.status(400);
		  }
		})
});

router.post('/login', (req, res) => {
  User.findByEmail(req.body.email.toLowerCase())
    .then( data => {
      if (data) {
        if(bcrypt.compareSync(req.body.password, data.password_digest)) {
          return User.generateToken(User.updateToken, data.id);
        } else {
          res.status(401).json({ errors: {password: 'Incorrect Password'} });
        }
      } else {
        res.status(401).json({ errors: {email: 'Incorrect Email'} });
      }
    })
    .then( user => {
      res.json(user);
    });
});

// User info

router.post('/authfb', (req, res) => {
	User.findByEmail(req.body.email.toLowerCase())
		.then( data => {
			if (data) {
				res.json(data)
			} else {
				const email = req.body.email.toLowerCase();
				const { name, picture } = req.body
				const fname = name.split(' ')[0];
				const lname = name.split(' ')[1];
				const username = name.split(' ')[0];
				let date = '';
		    const year = new Date().getFullYear();
		    const month = new Date().getMonth()+1;
		    const day = new Date().getDate();
		    date = `${year}-${month}-${day}`;
				User.generateToken(
					User.create, fname, lname, email, username, date, 0, 0, 0, 0, 0, 0, '', 1, 15, picture
				).then( data => {
					res.json(data)
				})
			}
		})
	}
)

router.get('/userinfo/:user_id',
	User.findById,
	(req, res) => {
		const { data } = res.locals;
		res.json({
			data: data
		})
	}
);

router.post('/userchanges',
	User.updateProfile,
	(req, res) => {
		const { new_changes } = res.locals;
		res.send(new_changes)
	}
);

module.exports = router;
