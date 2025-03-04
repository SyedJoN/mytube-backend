class ApiError extends Error {
   constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "" // error stack
 ) {
    super(message) 
    // Parent class (Error) ka constructor call kar rahe hain 
    // Aur message ko Error class ke andar set kar rahe hain
    
    this.statusCode = statusCode
    this.data = null
    this.message = message
    this.success = false
    this.errors = errors

    if(stack) {
        this.stack = stack;
    } else {
        Error.captureStackTrace(this, this.constructor)
    }

   }
}

export {ApiError}