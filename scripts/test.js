function reverseWords(message) {
    console.log("test");
    var messageArray = message.split("");
    
    reverseCharacters(sentenceArray, 0, sentenceArray.length-1); 
    
    var currentStartIndex = 0; 
    for (var i = 0; i < messageArray.length; i++){
        if (i == messageArray.length || messageArray[i] == " ") {
         	reverseCharacters(messageArray, currentStartIndex, i-1); 
            currentStartIndex = i+1; 
        }
    }
    return messageArray.join(""); 
}

function reverseWords(messageArray, start, end) {
    while (start < end) {
     	var temp = messageArray[start];
        messageArray[start] = messageArray[end];
        messageArray[end] = temp;
    	start++;
        end++;
    }
}
// run your function through some test cases here
// remember: debugging is half the battle!
console.log(reverseWords('lahtnesoR noediG'));
