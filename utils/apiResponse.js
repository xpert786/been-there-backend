

module.exports = {

  
    ValidationError: (res, msg) => {
      return res.status(400).json({
        status: 400,
        success:false,
        message: msg,          
      });
    },
   
    SuccessResponseWithData: (res, msg, data) => {
      return res.status(200).json({
        status: 200,
        success:true,
        message: msg,
        data: data,
            
      });
    },

    SuccessResponseWithDataCount: (res, msg, data,totalCount) => {
      return res.status(200).json({
        status: 200,
        success:true,
        message: msg,
        data: data,
        totalCount:totalCount
            
      });
    },
    
  
    SuccessResponseWithOutData: (res,msg) => {
      return res.status(200).json({
        status: 200,
        success:true,
        message: msg,
      });
    },
    SuccessResponseWithToken: (res,token ,msg,data) => {
      return res.status(200).json({
        status: 200,
        success:true,
        token:token,
        message: msg,
        data:data
          
      });
    },
  
    InternalServerError: (res, e) => {
      return res.status(500).json({
        status: 500,
        success:false,
        message: 'Internal server error',
        error: e.message,
      });
    },
    SomethingWentWrong: (res, e) => {
      return res.status(400).json({
        status: 400,
        success:false,
        message: 'Something Went Wrong',
        error: e.message
      });
    },
    
    UnAuthorized: (res, msg) => {
      return res.status(401).json({
        status: 401,
        success:false,
        message: msg,
      });
          
    },
    NotFound: (res, msg) => {
      return res.status(404).json({
        status: 404,
        success:false,
        message: msg,
      });
    },
    
    ValidationError: (res,  msg) => {
      return res.status(422).json({
        status: 422,
        success:false,
        message: msg,
      });
    },
      
   TokenExpiredError : (res, e) => {
      return res.status(401).json({
        status: 401,
        success:false,
        message:'Token Expired',
        error:e.message
            
      });
    },
  
  
  
  
  
      
  };
          