(function($) {
  
  //Sets up the content track, initializing all of its settings
  $.fn.slider = function(operation, args)
  { 
    var settings;
    
    if (operation == 'create') {
      //Allow for user to specify classes and options
      settings = $.extend({
        sliderId:         'slider',
        panelClass:       'contentPanel',
        currentClass:     'currentPanel',
        temporaryClass:   'tempPanel',
        fadeClass:        'fadePanel',
        dynamicHeight:    true,
        dynamicMargins:   true,
        wrapAround:       false,
        displayButtons:   'none',
        buttonWrapperID:  'sliderButtonWrapper',
        slideDuration:    750, 
        fadeDuration:     750,
        scrollDelay:      200
      }, args);
    
      var slider = this;
      
      //If the slider's class matches the current element, we use it as our slider
      //Otherwise, we need to wrap the content in a new slider element
      if (!this.is('#'+settings.sliderId))
      {
        this.wrapInner('<div id="' + settings.sliderId + '"></div>');
        slider = this.find('#' + settings.sliderId);
      }
      slider.data('slider', settings);
      
      //Set the width of the track to the width of the parent element
      slider.css('display', 'block');
      updateWidth(settings);
    
      //Initialize panels so only the first is visible
      $('#' + settings.sliderId + ' > div').each(function()
      {
        var panel = $(this);
        slider.slider('addPanel', panel);
      });
    
      var initialPanel;
      if (settings.initialDisplayId) initialPanel = slider.find('#' + settings.initialDisplayId);
      else initialPanel = slider.find('div:first');
      if ($('.' + settings.panelClass).index(initialPanel) == -1) initialPanel = slider.find('div:first');
    
      initialPanel.addClass(settings.currentClass).css('display', 'block');
    
      //Dynamic margins will force elements to stay centered 
      if (settings.dynamicMargins)
        //Wire up the browser to fire off our resize function
        $(window).bind('resize.slider', function() {
          $('.' + settings.panelClass, slider).each(function(){
            updateMargins($(this), settings);
          });
          updateWidth(settings);
        });
    
      if (settings.displayButtons != 'none')
        addButtons(slider.find('.' + settings.currentClass), settings);
    
      return slider;
    }
    else {
      settings = this.data('slider');
      
      //Slides forward, backward, or to an arbitrary div with a class matching the passed element
      if (operation == 'slide') {
        var destination = args[0];
        var callback = args.length > 1 ? args[1] : null;
        
        var slidePanel = this.find('.' + settings.currentClass);
        var lastPanel = slidePanel;

        //Determine various metrics for resizing and positioning
        var currentPanelHeight = slidePanel.height();
        var newPanelHeight = currentPanelHeight;
        var newPanelHeightError = newPanelHeight;
        //Includes margin for accurate animation
        var offset = slidePanel.outerWidth(true);
        var revert = null;
        var width = this.outerWidth();
        this.css('width', width * 2);
        this.css('min-width', width*2);

        //Ensure that any back/forward buttons are removed for proper animation
        if (settings.displayButtons != 'none')
        {
          if (settings.displayButtons == 'previous' || settings.displayButtons == 'both')
            $('.' + settings.prevButton).remove();
          if (settings.displayButtons == 'next' || settings.displayButtons == 'both')
            $('.' + settings.nextButton).remove();
        }

        //Slide forward
        if (destination == 'next')
        {
          //If the user attempts to move past the last child
          // - Do nothing if wrap-around is disabled
          // - Move the first child to the end of the content track, otherwise
          if (slidePanel[0] == this.find('.' + settings.panelClass + ':last')[0])
          {
            if (settings.wrapAround)
            {
              firstToLast(this);
              revert = 'first';
            }
            else
            {
              this.css('width', width);
              return this;
            }
          }
          //Update classes and styles for animation
          slidePanel =  slidePanel.addClass(settings.temporaryClass).removeClass(settings.currentClass).next().addClass(settings.currentClass).css('display', 'block');
        }
        //Slide backward
        else if (destination == 'previous')
        {
          //If the user attempts to move before the first child
          // - Do nothing if wrap-around is disabled
          // - Move the last child to the front of the slide container, otherwise
          if (slidePanel[0] == this.find('.' + settings.panelClass + ':first')[0])
          {
            if (settings.wrapAround)
            {
              lastToFirst(this);
              revert = 'last';
            }
            else
            {
              slider.css('width', width);
              return this;
            }
          }
          //Update classes and styles for animation
          this.css('margin-left', -1 * offset);
          slidePanel = slidePanel.addClass(settings.temporaryClass).removeClass(settings.currentClass).prev().addClass(settings.currentClass).css('display', 'block');
        }
        //Slide to an arbitrary panel
        else
        {
          //Get indexes of the current and target frames to determine the slide direction
          var targetPanel = this.find('#' + destination);
          var currentIndex = $('.' + settings.panelClass).index(slidePanel);
          var targetIndex = $('.' + settings.panelClass).index(targetPanel);

          //If we are already on the requested panel, or the requested panel does not exist, return without doing anything
          if (currentIndex == targetIndex || targetIndex == -1)
          {
            this.css('width', width);
            return this;
          }

          //Determine the slide direction, and update the track margin if necessary
          destination = currentIndex < targetIndex ? 'next' : 'previous';
          if (destination == 'previous') this.css('margin-left', -1 * offset);

          //Update classes and styles for animation
          slidePanel.addClass(settings.temporaryClass).removeClass(settings.currentClass);
          slidePanel = targetPanel.addClass(settings.currentClass).css('display', 'block');
        }

        var panelContents;

        //If the panel heights are dynamic, adjust the new panel's height to match current
        if (settings.dynamicHeight)
        {
          //If the user specifies a region to animate in place of the panel, take that into account for animation
          panelContents = slidePanel;
          for (var index = 0; index < settings.contentClass.length; index++)
          {
            var className = settings.contentClass[index];
            if ($('.' + className, slidePanel)[0])
            {
              panelContents =  $('.' + className, slidePanel);
              break;
            }
          }
          var totalHeight = slidePanel.height();
          newPanelHeight = panelContents.height();
          panelContents.wrapInner('<div class="' + settings.fadeClass + '" style="display: none;"></div>');
          panelContents.css('height', currentPanelHeight - (totalHeight - newPanelHeight));
        }

        offset *= destination == 'next' ? -1 : 1;
        offset = '+=' + offset;
        this.animate({marginLeft: offset}, settings.slideDuration, function()
        {
          var slider = $(this);
          
          //Reset the div ordering if the divs were moved for wrapping
          if (revert == 'first')
            lastToFirst(slider, settings);
          else if (revert == 'last')
            firstToLast(slider, settings);

          //Reset the track position
          slider.css('margin-left', '0px');
          slider.css('width', width);
          slider.css('min-width', width);
          $('.' + settings.temporaryClass).css('display', 'none').removeClass(settings.temporaryClass);

          $('html, body').delay(settings.scrollDelay).animate({scrollTop:0}, settings.slideDuration);
          //Animate the panel's height and fade in the new content if we are using dynamic height settings
          if (settings.dynamicHeight)
          {
            var overflowSetting = panelContents.css('overflow'); //Animate height changes overflow to hidden; we change it back.
            panelContents.animate({height: newPanelHeight}, settings.slideDuration, function()
            {
              if (callback) callback();
              fadePanel = panelContents.find('.' + settings.fadeClass).fadeIn(settings.fadeDuration, function()
              {
                fadePanel.replaceWith(fadePanel.contents());
                panelContents.css('height', 'auto');
                slidePanel.css('height', 'auto');
              });
              if (showButtonsOnPanel(slidePanel, settings))
                addButtons(slidePanel);
              if(showNextButtonOnPanel(slidePanel, settings))
                $('.' + settings.nextButton).fadeIn(settings.fadeDuration);
              if(showPrevButtonOnPanel(slidePanel, settings))
                $('.' + settings.prevButton).fadeIn(settings.fadeDuration);
              updateMargins(slidePanel, settings);
            }).css('overflow', overflowSetting);
          }
          else if (callback) callback(); //We still want to fire the callback function if dynamic height is disabled
        });

        return this;
      }
      //Add a panel to the content track at the specified index
      //panel can either be a jQuery object or a string representation of a new element
      //If index is not specified, the panel will be appended to the end of the list
      else if (operation == 'addPanel') {
        
        var lastIndex = this.children().length;
        var panel = args[0];
        //If index is passed in, update it to reflect nth-child notation (So 0th index is 1st child, etc.)
        var index = args.length > 1 ? args[1] : lastIndex + 1;
          
        //Add the panel to the front of the track temporarily (this allows us to create a new panel from a string argument)
        this.prepend(panel);
        panel = this.find('div:first');

        //In the event of the createSlider function being called on a slider already in existence,
        //we must ensure that currentClass is only applied to one element to prevent breaking our slideTo().
        panel.removeClass(settings.currentClass);

        //Update panel styles
        panel.addClass(settings.panelClass);
        panel.css('display', 'none');
        panel.css('float', 'left');

        //Place the panel in the correct location based on the requested index
        if (index > lastIndex)
          this.append(panel);
        else
          panel.insertBefore('.' + settings.panelClass + ':nth-child(' + (index + 1) + ')', this);

        //If we are using dynamic margin settings, we need to update the margins for the added panel
        if (settings.dynamicMargins)
          updateMargins(panel, settings);

        return this;
      }
    }
  };
  
  //Updates the slider's width in order to maintain dimensions for proper animation
  function updateWidth(settings)
  {
    var slider = $('#' + settings.sliderId);
    var newWidth = slider.parent().width();
    newWidth = newWidth > settings.minWidth ? newWidth : settings.minWidth;
    slider.css('width', newWidth);
  }
  
  //Updates a panel's margins in order to maintain central positioning during a browser resize
  function updateMargins(panel, settings)
  {
    var container = $('#' + settings.sliderId).parent();
    panel.css('margin-left', (container.width() - panel.outerWidth())/2);

    if (showButtonsOnPanel(panel, settings) && isCurrentPanel(panel, settings))
        updateButtonPositions(panel, settings);
  }
  
  //Move the first child div to the end of the display list for animation purposes
  function firstToLast(container, settings)
  {
    var firstPanel = container.find('.' + settings.panelClass + ':first');
    container.append(firstPanel);
  }
  
  //Move the last child div to the front of the display list for animation purposes
  function lastToFirst(container, settings)
  {
    var lastPanel = container.find('.' + settings.panelClass + ':last');
    container.prepend(lastPanel);
  }
  
  //Returns true if the requested panel is the panel currently being displayed
  function isCurrentPanel(panel, settings)
  {
    return panel.hasClass(settings.currentClass);
  }
  
  //Appends buttons to the requested panel, depending on the requested display settings
  function addButtons(panel, settings)
  {
    var slider = $('#' + settings.sliderId);
    
    panel.wrapAll('<div id="' + settings.buttonWrapperID + '"></div>');
    var buttonWrapper = $('#' + settings.buttonWrapperID);
    
    var buttonStyle = "position: absolute; top: 0; right: -";
    
    if (showNextButtonOnPanel(panel, settings))
    {
      buttonWrapper.append('<div class="' + settings.nextButton + '"></div>');
      var nextButton = $('.' + settings.nextButton);
      nextButton.css({'display': 'none', 'position': 'absolute'});
      var topOffset = (getContentHeight(panel) - nextButton.height())/2;
      if (settings.maxButtonHeight)
        topOffset = topOffset > settings.maxButtonHeight ? settings.maxButtonHeight : topOffset;
      nextButton.css('top', topOffset);
      nextButton.bind('click.slider', function(){
        slider.slider('slide', ['next']);
        return false;
      });
    }
    if (showPrevButtonOnPanel(panel, settings))
    {
      buttonWrapper.prepend('<div class="' + settings.prevButton + '"></div>');
      var prevButton = $('.' + settings.prevButton);
      prevButton.css({'display': 'none', 'position': 'absolute'});
      var topOffset = (panel.outerHeight() - prevButton.height())/2;
      if (settings.maxButtonHeight)
        topOffset = topOffset > settings.maxButtonHeight ? settings.maxButtonHeight : topOffset;
      prevButton.css('top', topOffset);
      prevButton.bind('click.slider', function(){
        slider.slider('slide', ['previous']);
        return false;
      });
    }
    buttonWrapper.replaceWith(buttonWrapper.contents());
    updateButtonPositions(panel);
  }
  
  //Updates the positions of any buttons that have been added
  function updateButtonPositions(panel, settings)
  {
    var slider = $('#' + settings.sliderId);
    var button;
    
    if (showNextButtonOnPanel(panel, settings))
    {
      button = $('.' + settings.nextButton);
      updateButtonPosition(panel, button, 'right');
    }
    if (showPrevButtonOnPanel(panel, settings))
    {
      button = $('.' + settings.prevButton);
      updateButtonPosition(panel, button, 'left');
    }
  }
  
  //Updates the specified button's location to sit to the left or right of the panel, depending on location's value
  function updateButtonPosition(panel, button, location)
  {
    var display = button.css('display');
    button.css('display', 'block');
    var offset = Number(panel.css('margin-left').replace(/px/, '')) - button.outerWidth(true) + 'px';
    
    if (location == 'left') button.css({'left': offset, 'display': display});
    else button.css({'right': offset, 'display': display});
  }
  
  //Returns true if any buttons should be displayed on the indicated panel; false, otherwise
  function showButtonsOnPanel(panel, settings)
  {
    if (showPrevButtonOnPanel(panel, settings) || showNextButtonOnPanel(panel, settings))
      return true;
    return false;
  }
  
  //Returns true if the "next" button should be displayed on the indicated panel; false, otherwise
  function showNextButtonOnPanel(panel, settings)
  {
    var slider = $('#' + settings.sliderId);
    if (settings.displayButtons == 'next' || settings.displayButtons == 'both')
      if (!(panel[0] == slider.find('.' + settings.panelClass + ':last')[0] && !settings.wrapAround))
        return true;
    return false;
  }
  
  //Returns true if the "previous" button should be displayed on the indicated panel; false, otherwise
  function showPrevButtonOnPanel(panel, settings)
  {
    var slider = $('#' + settings.sliderId);
    if (settings.displayButtons == 'previous' || settings.displayButtons == 'both')
      if (!(panel[0] == slider.find('.' + settings.panelClass + ':first')[0] && !settings.wrapAround))
        return true;
    return false;
  }

}(jQuery));