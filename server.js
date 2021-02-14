// Taken from: https://www.tutorialspoint.com/webrtc/webrtc_signaling.htm
var WebSocketServer = require('ws').Server;
 
var wss = new WebSocketServer({port: 8080}); 

// Anyone currently connected shows up here 
var users = {};
  
//when a user connects to our sever 
wss.on('connection', function(connection) {
   console.log("User connected");
	
   //when server gets a message from a connected user
   connection.on('message', function(message) { 
	
      var data; 
      //accepting only JSON messages 
      try {
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      } 
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login 
			
         case "login": 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               console.log("User tried to log in: ", data.name); 
               sendTo(connection, { 
                  type: "login", 
                  success: false 
               }); 
            } else { 
               console.log("User logged in: ", data.name); 
               //save user connection on the server 
               users[data.name] = connection; 
               connection.name = data.name; 
					
               sendTo(connection, { 
                  type: "login", 
                  success: true 
               }); 
            } 
				
            break; 
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Received offer", JSON.stringify(data)); 
				
            //if UserB exists then send him offer details 
            var conn = users[data.name];
				
            if(conn != null) { 
               console.log("Sending offer to: ", data.name); 
               //setting that UserA connected with UserB 
               connection.otherName = data.name; 
					
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: connection.name 
               }); 
            } else {
               console.log("Tried sending offer to: ", data.name, " but it was null"); 
            }
				
            break;  
				
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            var conn = users[data.name]; 
				
            if(conn != null) { 
               connection.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               }); 
            } 
				
            break;  
				
         case "candidate": 
            var conn = users[data.name];  
				
            if(conn != null) { 
               console.log("Sending candidate to:",data.name); 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               });
            } else {
               console.log("Tried sending candidate to: ",data.name, " but it was null"); 
            }
				
            break;  
				
         case "leave": 
            var conn = users[data.name]; 
            console.log("Disconnecting", data.name, "and", conn.otherName);
            conn.otherName = null; 
				
            //notify the other user so he can disconnect his peer connection 
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               }); 
            }  
				
            break;  
				
         default: 
            sendTo(connection, { 
               type: "error", 
               message: "Command not found: " + data.type 
            }); 
				
            break; 
      }  
   });  
	
   // when user exits, for example closes a browser window
   // this may help if we are still in "offer","answer" or "candidate" state
   connection.on("close", function() { 
	
      if(connection.name) { 
         delete users[connection.name];
		
         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName);
            var conn = users[connection.otherName]; 
            conn.otherName = null;  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "leave" 
               });
            }  
         } 
      } 
   });  
});  

function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}
