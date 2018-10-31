const API_KEY = "";

var express = require('express');
var router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const request = require('request');
const uuidv4 = require('uuid/v4');
var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});

// Initialize database connection
mongoose.connect('mongodb://localhost/nodefd');

// Test DB connection
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log('Connected to db');
});

// Define DB schema and Data model
var Schema = mongoose.Schema;
var dataSchema = new Schema({
  // data: [{ faceid: String, gender: String, age: String }],
  data: Array,
  url: String,
  image: String,
  date: { type: Date, default: Date.now },
});
var data = mongoose.model('Data', dataSchema);

function detectFace(url){
  return new Promise((resolve, reject) => {
    axios({
      method: 'post',
      url: 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': API_KEY
      },
      params: {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        // "returnFaceAttributes": "age,gender"
        "returnFaceAttributes": "age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise",
      },
      data: {
        url: url
      }        
    }).then(function (res) {
        resolve(res.data);
    }).catch(function (err) {
        reject(err.response.data.error);
    })
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Face Detection'});
});

/* GET history page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Face Detection'});
});


// Recive URL
router.post('/', function(req, res){
  let newURL = req.body.title;
  
  // API Call
  detectFace(newURL).then(successCallback, failureCallback);

  // ** Get promise (result) from detectFace function
  function successCallback(result) {
    // Create an instance of Data model and save it in DB
    var newFace = { 
      date: undefined, 
      url: newURL, 
      data: result 
    }; 
    
    data.create(newFace, function(err){ 
        if(err) throw err; 
    }); 

    // Convert JSON Object to be suitable for showing in Text Area
    var info = JSON.stringify(result, null, 2);
        
    // Download and manipulate image file
    let imageName = uuidv4() + '.png';
    var g = gm(request(newURL));
    g.strokeWidth(7)
    g.fill()
    result.forEach(element => {
      var gender = element.faceAttributes.gender;
      if (gender == 'male') {
        g.stroke("LightBlue")
      } else {
        g.stroke("LightCoral")
      }
      var y0 = element.faceRectangle.top;
      var x0 = element.faceRectangle.left;
      var z = element.faceRectangle.width;
      g.drawRectangle(x0, y0, z+x0, z+y0)
    });
    g.write('public/images/' + imageName, function (err) {
      if (!err) {
        console.log('Image Created');
        // Render Template and send Data
        res.render('result', { call: info, ipath: '/images/' + imageName, url: newURL });
      }
    });
  }

  function failureCallback(error) {
    console.log("It failed with " + error);
  }
});

module.exports = router;
