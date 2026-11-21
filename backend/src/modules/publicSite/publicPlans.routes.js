'use strict';
const router = require('express').Router();
const Plan = require('../plans/plan.model');

// Datos comerciales públicos; nunca devuelve información de las empresas ni registros internos.
router.get('/', async (_req,res,next)=>{
 try{
   const plans = await Plan.find({isActive:true})
     .select('code name description monthlyPriceCOP modules limits -_id')
     .sort({monthlyPriceCOP:1,name:1}).lean();
   res.set('Cache-Control','public, max-age=60');
   return res.json({plans});
 }catch(error){next(error)}
});
module.exports=router;
