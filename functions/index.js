'use strict';

process.env.DEBUG = 'actions-on-google:*';
const { DialogflowApp } = require('actions-on-google');
const functions = require('firebase-functions');
const Datastore = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = Datastore();


const Actions = {
    START_APP: 'start_app',
    QUIT_APP: 'quit_app',
    ONCE_MORE_YES: 'once_more_yes',
    ONCE_MORE_NO: 'once_more_no',
    DEFAULT_FALLBACK: 'input.unknown'
  };

  const Contexts = {
    QUOTE: 'quote',
    ONE_MORE: 'one_more'
  };
  
  class InspireMe {
    /**
     * Create a new instance of the app handler
     * @param {AoG.ExpressRequest} req
     * @param {AoG.ExpressResponse} res
     */
    constructor (req, res) {
      console.log(`Headers: ${JSON.stringify(req.headers)}`);
      console.log(`Body: ${JSON.stringify(req.body)}`);
      /** @type {DialogflowApp} */
      this.app = new DialogflowApp({ request: req, response: res });
      /** @type {AppData} */
      this.data = this.app.data;
    }

    /**
   * Get the Dialogflow intent and handle it using the appropriate method
   */
  run () {
    /** @type {*} */
    const map = this;
    const action = this.app.getIntent();
    console.log(action);
    if (!action) {
      return this.app.ask(`I didn't hear anything.Do you want to hear a quote?`);
    }
   return map[action]();
  }

  


  [Actions.QUIT_APP] () {
    this.app.tell("Have a good day! come back again. Bye!");
  }

  [Actions.START_APP] () {
    this.app.setContext(Contexts.ONE_MORE);
    const initMessage = ` Welcome to Inspire Me. With great quotes and inspiring passages, I will inspire you.<break time="2s"/>`;
    if(this.app.hasSurfaceCapabilty(this.app.SurfaceCapabilities.SCREEN_OUTPUT)){
      getQuoteFromDataStore( getQuoteFromDsWithApp(this.app,initMessage,true) );
    }else{
      getQuoteFromDataStore( getQuoteFromDsWithApp(this.app,initMessage,false) );
    }
      
  }

  [Actions.ONCE_MORE_YES] () {
      this.app.setContext(Contexts.ONE_MORE);
      const initMessage = `Great! Here is another one.<break time="1s"/>`;
      getQuoteFromDataStore( getQuoteFromDsWithApp(this.app,initMessage) );  
      
  }

  [Actions.ONCE_MORE_NO] () {
    this.app.setContext(Contexts.ONE_MORE);
    this.app.tell("Hope you're inspired and ready to take on your challenges. Have a good day and come back for more.");
}

[Actions.DEFAULT_FALLBACK] () {
    console.log(this.data.fallbackCount);
    if (typeof this.data.fallbackCount !== 'number') {
      this.data.fallbackCount = 0;
    }
    this.data.fallbackCount++;
    // Provide two prompts before ending game
    if (this.data.fallbackCount === 1) {
      this.app.setContext(Contexts.ONE_MORE);
      return this.app.ask("Would you like to hear a quote? ");
    }
   return this.app.tell("Have a good day. Bye! ");
}




}

function getRandomNumber(){
  return  Math.floor((Math.random()*28));
}

function getQuoteFromDataStore(askFunction){
  let randomQuoteNum = getRandomNumber();
  console.log("the id of the quote is: quote_"+randomQuoteNum);
  const key = datastore.key(['quote', 'quote_'+randomQuoteNum]);
  console.log("Querying datastore for the quote..."+key);
  let readableQuote = '';
  datastore.get(key,(err,entity) => {
    if(!err){
      console.log('entity:'+entity.quote);
     askFunction(entity);
     
    }else{
      console.log('Error occurred');
    }
  });
}

function buildReadableQuoteFromEntity(entity){
  let readableQuote =  entity.quote + 
     `<break time="1s"/> This was said by ` + entity.author + ` `  ;
     if(entity.comments){
       readableQuote +=  entity.comments + ` `;
     }
     return readableQuote;
}

function getEndingMessage(){
return `  <audio src="https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg" clipBegin="10s" clipEnd="13s">Consider the quote!</audio>
     Do you want to listen to another quote?`;
}

function getQuoteFromDsWithApp(app,initMessage,hasScreen){

  console.log('app in cl:'+app);
 return entity => {
   if(hasScreen){
     const response = app.buildRichResponse();
     response.addSimpleResponse(initMessage);
     response.addBasicCard("**"+entity.quote+"**"+"\n"+"-"+entity.author);
     response.addSimpleResponse("Do you want to see another quote?");
     response.addSuggestions(["yes","no"]);
    app.ask(response);
   }else{
    app.ask(`<speak> `+ initMessage +  buildReadableQuoteFromEntity(entity)   + getEndingMessage() + ` </speak>  `);
   }
  };
}

// HTTP Cloud Function for Firebase handler
exports.InspireMe = functions.https.onRequest(
    /** @param {*} res */ (req, res) => new InspireMe(req, res).run()
  );
  