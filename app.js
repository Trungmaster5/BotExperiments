var builder = require('botbuilder');
var restify = require('restify');
var githubClient = require('./github-client.js');
const env= require('dotenv');
env.config();

// Create chat bot and listen for messages
var connector = new builder.ChatConnector({
  appID: process.env.MICROSOFT_APP_ID,
  appPassword:process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());

// Setup recognizer with LUIS
const recognizer= new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
recognizer.onEnabled(function(context, callback){
  if (context.dialogStack().length >0){
    // we are in a converstation
      callback(null,false);
  } else {
      callback(null,true);
  }
});

// Add recognizer to bot
bot.recognizer(recognizer);

// Create dialog
// var dialog = new builder.IntentDialog();
// dialog.matches('search', [
//     function (session, args, next) {
//         const query= builder.EntityRecognizer.findEntity(args.intent.entities,'query');
//         if (!query) {
//             // No matching entity
//             builder.Prompts.text(session, 'Who did you want to search for?');
//
//         } else {
//             //the user typed in: search <<name>>
//             next({ response: query.entity });
//         }
//     },
//     function (session, results, next) {
//         var query = results.response;
//         if (!query) {
//             session.endDialog('Request cancelled');
//         } else {
//             githubClient.executeSearch(query, function (profiles) {
//                 var totalCount = profiles.total_count;
//                 if (totalCount == 0) {
//                     session.endDialog('Sorry, no results found.');
//                 } else if (totalCount > 10) {
//                     session.endDialog('More than 10 results were found. Please provide a more restrictive query.');
//                 } else {
//                     session.dialogData.property = null;
//                     var usernames = profiles.items.map(function (item) { return item.login });
//
//                     // TODO: Prompt user with list
//                     builder.Prompts.choice(
//                       session,
//                       'Please choose user you are looking for',
//                       usernames,
//                       {listStyle: builder.ListStyle.button}
//                     );
//                 }
//             });
//         }
//     }, function(session, results, next) {
//         // TODO: Display final request
//         // When you're using choice, the value is inside of results.response.entity
//
//         //E.g.session.endConversation(`You chose ${results.response.entity}`);
//         session.sendTyping();
//         githubClient.loadProfile(results.response.entity,
//           function(profile){
//             var card= new builder.HeroCard(session);
//
//             card.title(profile.login);
//             card.images([builder.CardImage.create(session,profile.avatar_url)]);
//             if (profile.name) card.subtitle(profile.name);
//
//             var text='';
//             if (profile.company) text+= profile.company + '\n\n';
//             if (profile.email) text+= profile.email + '\n\n';
//             if (profile.bio) text+=profile.bio;
//             card.text(text);
//             card.tap(new builder.CardAction.openUrl(session,profile.html_url));
//
//             var message= new builder.Message(session).attachments([card]);
//             session.send(message);
//           });
//     }
// ]);

bot.dialog('search',[
  function (session, args, next) {
      console.log(args);
      const query= builder.EntityRecognizer.findEntity(args.intent.entities,'query');
      if (!query) {
          // No matching entity
          builder.Prompts.text(session, 'Who did you want to search for?');
      } else {
          //the user typed in: search <<name>>
          next({ response: query.entity });
      }
  },
  function (session, results, next) {
      var query = results.response;
      if (!query) {
          session.endDialog('Request cancelled');
      } else {
          githubClient.executeSearch(query, function (profiles) {
              var totalCount = profiles.total_count;
              if (totalCount == 0) {
                  session.endDialog('Sorry, no results found.');
              } else if (totalCount > 10) {
                  session.endDialog('More than 10 results were found. Please provide a more restrictive query.');
              } else {
                  session.dialogData.property = null;
                  var usernames = profiles.items.map(function (item) { return item.login });

                  // TODO: Prompt user with list
                  builder.Prompts.choice(
                    session,
                    'Please choose user you are looking for',
                    usernames,
                    {listStyle: builder.ListStyle.button}
                  );
              }
          });
      }
  }, function(session, results, next) {
      // TODO: Display final request
      // When you're using choice, the value is inside of results.response.entity

      //E.g.session.endConversation(`You chose ${results.response.entity}`);
      session.sendTyping();
      githubClient.loadProfile(results.response.entity,
        function(profile){
          var card= new builder.HeroCard(session);

          card.title(profile.login);
          card.images([builder.CardImage.create(session,profile.avatar_url)]);
          if (profile.name) card.subtitle(profile.name);

          var text='';
          if (profile.company) text+= profile.company + '\n\n';
          if (profile.email) text+= profile.email + '\n\n';
          if (profile.bio) text+=profile.bio;
          card.text(text);
          card.tap(new builder.CardAction.openUrl(session,profile.html_url));

          var message= new builder.Message(session).attachments([card]);
          session.send(message);
        });
  }
]).triggerAction({
  matches:'SearchPromp'
});

// bot.dialog('/', dialog);
