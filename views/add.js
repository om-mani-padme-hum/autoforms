/** Require external modules */
const ezforms = require(`ezforms`);
const moment = require(`moment`);

module.exports = (autoform) => {
  return async (req, res, next) => {
    try {
      /** If can't add records, redirect to list */
      if ( !autoform.canAdd() ) {
        /** Redirect to list */
        res.redirect(`list`);
        
        /** We're done */
        return;
      }
      
      /** If not logged in, can't add records */
      else if ( !req.user || ( autoform.addPermission() != -1 && !req.user.permissions().includes(autoform.addPermission()) ) ) {
        /** Redirect to login */
        res.redirect(`login?return=edit`);
        
        /** We're done */
        return;
      }
    
      /** If method is POST, process added record */
      if ( req.method == `POST` ) {
        /** Create record */
        const record = new autoform.Record();
        
        /** Loop through each autoform property... */
        autoform.properties().forEach((property) => {
          /** If the property is the id property or is not editable, skip */
          if ( property.name() == `id` || !property.canEdit() )
            return;
          
          /** Set record property */
          record[property.name()](req.body[property.name()]);
        });
        
        /** Insert record into database */
        await record.insert(req.db);
        
        /** Redirect to list */
        res.redirect(`list`);
        
        /** We're done */
        return;
      }
          
      /** Create new EZ form */
      const form = new ezforms.Form();
      
      /** Set form action to this page */
      form.action(`add`);
      
      /** Set form method to POST */
      form.method(`POST`);
      
      /** Add form heading */
      form.heading().rank(1).text(`Add Record`);
      
      /** Loop through each of the auto form's properties */
      autoform.properties().forEach((property) => {
        /** If the property is the id property or is not editable, skip */
        if ( property.name() == `id` || !property.canEdit() )
          return;
        
        /** If property type is 'text'... */
        if ( property.type() == `text` && property.options().length == 0 )
          form.text().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
        
        /** Otherwise, if the property type is 'text', 'int', or 'double', and there are options and input type is 'select'... */
        else if ( [`text`, `int`, `double`].includes(property.type())  && property.options().length > 0 && property.inputType() == `select` ) {
          form.select().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled());
      
          property.options().forEach((option) => {
            form.option().value(option.value).text(option.label);
          });
        }
        
        /** Otherwise, if the property type is 'text', 'int', or 'double', and there are options and input type is 'radios'... */
        else if ( [`text`, `int`, `double`].includes(property.type())  && property.options().length > 0 && property.inputType() == `radios` ) {
          form.radios().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled()).align(property.alignment());
      
          property.options().forEach((option) => {
            form.option().value(option.value).text(option.label);
          });
        }
        
        /** Otherwise, if the property type is 'int' and there are no options... */
        else if ( property.type() == `int` && property.options().length == 0 )
          form.number().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
        
        /** Otherwise, if the property type is 'double'... */
        else if ( property.type() == `double` && property.options().length == 0 )
          form.number().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'date'... */
        else if ( property.type() == `date` )
          form.date().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'datetime'... */
        else if ( property.type() == `datetime` )
          form.datetime().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'time'... */
        else if ( property.type() == `time` )
          form.time().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'color'... */
        else if ( property.type() == `color` )
          form.color().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).pattern(property.pattern()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'textarea'... */
        else if ( property.type() == `textarea` )
          form.textarea().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'textarea'... */
        else if ( property.type() == `file` )
          form.file().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled());
      
        /** Otherwise, if the property type is 'array' and input type is 'checkboxes'... */
        else if ( property.type() == `array` && property.inputType() == `checkboxes` ) {
          form.checkboxes().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled()).align(property.alignment());
      
          property.options().forEach((option) => {
            form.option().value(option.value).text(option.label);
          });
        }
        
        /** Otherwise, if the property type is 'array' and input type is 'checkboxes'... */
        else if ( property.type() == `array` && property.inputType() == `multi-select` ) {
          form.multiselect().colsBefore(property.inputColumnsBefore()).cols(property.inputColumns()).colsAfter(property.inputColumnsAfter()).name(property.name()).label(property.inputLabel()).required(property.required()).disabled(property.disabled());
      
          property.options().forEach((option) => {
            form.option().value(option.value).text(option.label);
          });
        }
      });
      
      /** Add cancel and save buttons */
      form.button().cols(6).colsBefore(2).type(`button`).text(`Cancel`);
      form.button().cols(6).colsAfter(2).type(`submit`).text(`Save`);
      
      /** Attach form to page */
      req.page.append(form);
    } catch ( err ) {
      console.log(err);
    } finally {
      await req.db.close();
    }
    
    /** Call next express handler */
    next();
  };
};
