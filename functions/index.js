
'use strict';

const {dialogflow} = require('actions-on-google');
const functions = require('firebase-functions');
const Datastore = require('@google-cloud/datastore');
const {
  SimpleResponse,
  BasicCard,
  Image,
  Suggestions,
  Button
} = require('actions-on-google');

// Instantiate a datastore client
const datastore = Datastore();


  const Contexts = {
    QUOTE: 'quote',
    ONE_MORE: 'one_more'
  };
  
  const app = dialogflow({debug: true});

  app.middleware((conv) => {
    
  });

 

  app.intent('quit_app', (conv) => {
    conv.close("Have a good day! come back again. Bye!");
  });

  app.intent('start_app', (conv) => {
    conv.contexts.set(Contexts.ONE_MORE,5);
    const initMessage = ` Welcome to LitInspire. With great quotes and inspiring passages, I will inspire you.`;

    return  getQuote().then((entity)=>{
         return getMessageFromQuote(entity,initMessage,conv);
    });
      
  });

  app.intent('one_more_yes', (conv) => {
    conv.contexts.set(Contexts.ONE_MORE,3);
      const initMessage = `Great! Here is another one.`;
         
    return  getQuote().then((entity)=>{
      return getMessageFromQuote(entity,initMessage,conv);
  });
      
  });

  app.intent('one_more_no', (conv) => {
    conv.close("Hope you're inspired and ready to take on your challenges. Have a good day and come back for more.");
});

app.intent('Default Fallback Intent', (conv) => {
    console.log(conv.data.fallbackCount);
    if (typeof conv.data.fallbackCount !== 'number') {
      conv.data.fallbackCount = 0;
    }
    conv.data.fallbackCount++;
    // Provide two prompts before ending game
    if (conv.data.fallbackCount === 1) {
      conv.contexts.set(Contexts.ONE_MORE,2);
      return conv.ask(new Suggestions('Yes Please', 'No thanks'), new SimpleResponse("Would you like to hear a quote?"));
    }else if(conv.data.fallbackCount === 2){
      return conv.ask(new Suggestions('Yes Please', 'No thanks'), new SimpleResponse("Welcome to LitInspire. With great quotes and inspiring passages, I will inspire you.Would you like to hear a quote?"));
    }
   return conv.close("This isn't working.Have a good day. Bye! ");
});


function getRandomNumber(){

  return  Math.random();
}



function buildReadableQuoteFromEntity(entity){
  let readableQuote =  entity.quote + 
     `<break time="1s"/> This was said by ` + entity.author + ` `  ;
     if(entity.comments){
       readableQuote +=  entity.comments + ` `;
     }
     return readableQuote;
}

function getViewableQuote(entity){
  let viewableQuote =  entity.quote + 
     `.This was said by ` + entity.author + ` `  ;
     if(entity.comments){
      viewableQuote +=  entity.comments + ` `;
     }
     return viewableQuote;
}

function getEndingMessage(){
return `  <audio src="https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg" clipBegin="10s" clipEnd="13s">Consider the quote!</audio>
     Do you want to listen to another quote?`;
}


function getEndingMessageText(){
  return `.Do you want to listen to another quote?`;
  }

 function getMessageFromQuote(entity,initMessage,conv){
  return conv.ask(new Suggestions('Yes Please', 'No thanks'), new SimpleResponse(initMessage),
  new SimpleResponse( {text: getViewableQuote(entity) + getEndingMessageText(),
speech: `<speak> ` +  buildReadableQuoteFromEntity(entity)   + getEndingMessage() + ` </speak>  ` }));
 }

function getQuote(){
  let randomQuoteNum = getRandomNumber();
  let query = datastore.createQuery('quotes').order('rndFlt').filter('rndFlt','>',randomQuoteNum).limit(1)
  let queryAny = datastore.createQuery('quotes').order('rndFlt').limit(1)
  return new Promise(((resolve,reject) => {
   
  
  let readableQuote = '';
  datastore.runQuery(query,(err,entities) => {
    if(!err){
     if(entities.length>0){
       console.log('Got result from default query');
      resolve(entities[0]);
     }else{
       datastore.runQuery(queryAny,(err,entities) => {
         if(!err){
          console.log('Got result from queryAny query');
           resolve(entities[0]);
         }else{
           reject(console.log('Error occured'));
         }
       })
     }
    
    }else{
     reject(console.log('Error occured'));
    }
  });

  
  }));

 
}

// HTTP Cloud Function for Firebase handler
exports.InspireMe = functions.https.onRequest(app);
  