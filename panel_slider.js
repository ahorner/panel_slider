(function($) {
  
  //Sets up the content track, initializing all of its settings
  $.fn.slider = function(optionalArgs)
  {
    var contentTrack = $(this);
    
    //Global panelSliderOptions for the plugin allow for user to specify classes and settings
    panelSliderOptions = $.extend({
      sliderId:      'content_track',
      panelClass:       'content_panel',
      currentClass:     'current_panel',
      temporaryClass:   'temp_panel',
      fadeClass:        'fade_panel',
      dynamicHeight:    true,
      dynamicMargins:   true,
      wrapAround:       false,
      displayButtons:   'none',
      buttonWrapperID:  'sliderButtonWrapper'
    }, optionalArgs);
    
    //If the slider's class matches the current element, we use it as our slider
    //Otherwise, we need to wrap the content in a new slider element
    if (!contentTrack.is('#'+panelSliderOptions.sliderId))
    {
      contentTrack.wrapInner('<div id="' + panelSliderOptions.sliderId + '"></div>');
      contentTrack = contentTrack.find('#' + panelSliderOptions.sliderId);
    }
    
    //Set the width of the track to the width of the parent element
    contentTrack.css('display', 'block');
    updateWidth();
    
    //Initialize panels so only the first is visible
    $('#' + panelSliderOptions.sliderId + ' > div').each(function()
    {
      var panel = $(this);
      contentTrack.addPanel(panel);
    });
    contentTrack.find('div:first').addClass(panelSliderOptions.currentClass).css('display', 'block');
    
    //Dynamic margins will force elements to stay centered 
    if (panelSliderOptions.dynamicMargins)
    {
      //Wire up the browser to fire off our resize function
      $(window).resize(function() {
        $('.' + panelSliderOptions.panelClass, contentTrack).each(function(){
          updateMargins($(this));
        });
        updateWidth();
      });
    }
    
    if (panelSliderOptions.displayButtons != 'none')
    {
      addButtons(contentTrack.find('.' + panelSliderOptions.currentClass));
    }
    
    return contentTrack;
  };
  
  //Slides forward, backward, or to an arbitrary div with a class matching the passed element
  $.fn.slideTo = function(destination, callback)
  {
    var contentTrack = $(this);
    var slidePanel = contentTrack.find('.' + panelSliderOptions.currentClass);
    var lastPanel = slidePanel;
    
    //Determine various metrics for resizing and positioning
    var currentPanelHeight = slidePanel.height();
    var newPanelHeight = currentPanelHeight;
    var newPanelHeightError = newPanelHeight;
    //Includes margin for accurate animation
    var offset = slidePanel.outerWidth(true);
    var revert = null;
    var width = contentTrack.outerWidth();
    contentTrack.css('width', width * 2);
    contentTrack.css('min-width', width*2);
    
    //Ensure that any back/forward buttons are removed for proper animation
    if (panelSliderOptions.displayButtons != 'none')
    {
      if (panelSliderOptions.displayButtons == 'previous' || panelSliderOptions.displayButtons == 'both')
        $('.' + panelSliderOptions.prevButton).remove();
      if (panelSliderOptions.displayButtons == 'next' || panelSliderOptions.displayButtons == 'both')
        $('.' + panelSliderOptions.nextButton).remove();
    }
    
    //Slide forward
    if (destination == 'next')
    {
      //If the user attempts to move past the last child
      // - Do nothing if wrap-around is disabled
      // - Move the first child to the end of the content track, otherwise
      if (slidePanel[0] == contentTrack.find('.' + panelSliderOptions.panelClass + ':last')[0])
      {
        if (panelSliderOptions.wrapAround)
        {
          firstToLast(contentTrack);
          revert = 'first';
        }
        else
        {
          contentTrack.css('width', width);
          return contentTrack;
        }
      }
      //Update classes and styles for animation
      slidePanel =  slidePanel.addClass(panelSliderOptions.temporaryClass).removeClass(panelSliderOptions.currentClass).next().addClass(panelSliderOptions.currentClass).css('display', 'block');
    }
    //Slide backward
    else if (destination == 'previous')
    {
      //If the user attempts to move before the first child
      // - Do nothing if wrap-around is disabled
      // - Move the last child to the front of the slide container, otherwise
      if (slidePanel[0] == contentTrack.find('.' + panelSliderOptions.panelClass + ':first')[0])
      {
        if (panelSliderOptions.wrapAround)
        {
          lastToFirst(contentTrack);
          revert = 'last';
        }
        else
        {
          contentTrack.css('width', width);
          return contentTrack;
        }
      }
      //Update classes and styles for animation
      contentTrack.css('margin-left', -1 * offset);
      slidePanel = slidePanel.addClass(panelSliderOptions.temporaryClass).removeClass(panelSliderOptions.currentClass).prev().addClass(panelSliderOptions.currentClass).css('display', 'block');
    }
    //Slide to an arbitrary panel
    else
    {
      //Get indexes of the current and target frames to determine the slide direction
      var targetPanel = contentTrack.find('#' + destination);
      var currentIndex = $('.' + panelSliderOptions.panelClass).index(slidePanel);
      var targetIndex = $('.' + panelSliderOptions.panelClass).index(targetPanel);
      
      //If we are already on the requested panel, or the requested panel does not exist, return without doing anything
      if (currentIndex == targetIndex || !targetPanel)
      {
        contentTrack.css('width', width);
        return contentTrack;
      }
      
      //Determine the slide direction, and update the track margin if necessary
      destination = currentIndex < targetIndex ? 'next' : 'previous';
      if (destination == 'previous') contentTrack.css('margin-left', -1 * offset);
      
      //Update classes and styles for animation
      slidePanel.addClass(panelSliderOptions.temporaryClass).removeClass(panelSliderOptions.currentClass);
      slidePanel = targetPanel.addClass(panelSliderOptions.currentClass).css('display', 'block');
    }
    
    var panelContents;
    
    //If the panel heights are dynamic, adjust the new panel's height to match current
    if (panelSliderOptions.dynamicHeight)
    {
      //If the user specifies a region to animate in place of the panel, take that into account for animation
      panelContents = slidePanel;
      for (index in panelSliderOptions.contentClass)
      {
        var className = panelSliderOptions.contentClass[index];
        if ($('.' + className, slidePanel)[0])
        {
          panelContents =  $('.' + className, slidePanel);
          break;
        }
      }
      var totalHeight = slidePanel.height();
      newPanelHeight = panelContents.height();
      panelContents.wrapInner('<div class="' + panelSliderOptions.fadeClass + '" style="display: none;"></div>');
      panelContents.css('height', currentPanelHeight - (totalHeight - newPanelHeight));
    }
    
    offset *= destination == 'next' ? -1 : 1;
    offset = '+=' + offset;
    contentTrack.animate({marginLeft: offset}, function()
    {
      //Reset the div ordering if the divs were moved for wrapping
      if (revert == 'first')
        lastToFirst(contentTrack);
      else if (revert == 'last')
        firstToLast(contentTrack);
      
      //Reset the track position
      contentTrack.css('margin-left', '0px');
      contentTrack.css('width', width);
      contentTrack.css('min-width', width);
      $('.' + panelSliderOptions.temporaryClass).css('display', 'none').removeClass(panelSliderOptions.temporaryClass);
      
      //Animate the panel's height and fade in the new content if we are using dynamic height settings
      if (panelSliderOptions.dynamicHeight)
      {
        $('html, body').animate({scrollTop:0}, 'slow');
        panelContents.animate({height: newPanelHeight}, function()
        {
          if (callback) callback();
          fadePanel = panelContents.find('.' + panelSliderOptions.fadeClass).fadeIn('slow', function()
          {
            fadePanel.replaceWith(fadePanel.contents());
            panelContents.css('height', 'auto');
            slidePanel.css('height', 'auto');
          });
          if (showButtonsOnPanel(slidePanel))
            addButtons(slidePanel);
          if(showNextButtonOnPanel(slidePanel))
            $('.' + panelSliderOptions.nextButton).fadeIn('slow');
          if(showPrevButtonOnPanel(slidePanel))
            $('.' + panelSliderOptions.prevButton).fadeIn('slow');
        });
      }
      else if (callback) callback();
    });
    
    return contentTrack;
  };
  
  //Add a panel to the content track at the specified index
  //panel can either be a jQuery object or a string representation of a new element
  //If index is not specified, the panel will be appended to the end of the list
  $.fn.addPanel = function(panel, index)
  {
    var contentTrack = $(this);
    var lastIndex = contentTrack.children().length;
    
    //Add the panel to the front of the track temporarily (this allows us to create a new panel from a string argument)
    contentTrack.prepend(panel);
    panel = contentTrack.find('div:first');
    
    //In the event of the createSlider function being called on a slider already in existence,
    //we must ensure that currentClass is only applied to one element to prevent breaking our slideTo().
    panel.removeClass(panelSliderOptions.currentClass);
    
    //Update panel styles
    panel.addClass(panelSliderOptions.panelClass);
    panel.css('display', 'none');
    panel.css('float', 'left');
    
    //If index is passed in, update it to reflect nth-child notation (So 0th index is 1st child, etc.)
    index = typeof(index) != 'undefined' ? index + 1 : lastIndex + 1;
    
    //Place the panel in the correct location based on the requested index
    if (index > lastIndex)
      contentTrack.append(panel);
    else
      panel.insertBefore('#' + panelSliderOptions.sliderId + ' .' + panelSliderOptions.panelClass + ':nth-child(' + (index + 1) + ')');
    
    //If we are using dynamic margin settings, we need to update the margins for the added panel
    if (panelSliderOptions.dynamicMargins)
      updateMargins(panel);
    
    return contentTrack;
  }
  
  //Updates the slider's width in order to maintain dimensions for proper animation
  function updateWidth()
  {
    var contentTrack = $('#' + panelSliderOptions.sliderId);
    var newWidth = contentTrack.parent().width();
    newWidth = newWidth > panelSliderOptions.minWidth ? newWidth : panelSliderOptions.minWidth;
    contentTrack.css('width', newWidth);
  }
  
  //Updates a panel's margins in order to maintain central positioning during a browser resize
  function updateMargins(panel)
  {
    var container = $('#' + panelSliderOptions.sliderId).parent();
    panel.css('margin-left', (container.width() - panel.outerWidth())/2);

    if (showButtonsOnPanel(panel) && isCurrentPanel(panel))
        updateButtonPositions(panel);
  }
  
  //Move the first child div to the end of the display list for animation purposes
  function firstToLast(container)
  {
    var firstPanel = container.find('.' + panelSliderOptions.panelClass + ':first');
    container.append(firstPanel);
  }
  
  //Move the last child div to the front of the display list for animation purposes
  function lastToFirst(container)
  {
    var lastPanel = container.find('.' + panelSliderOptions.panelClass + ':last');
    container.prepend(lastPanel);
  }
  
  function isCurrentPanel(panel)
  {
    var currentIndex = $('.' + panelSliderOptions.currentClass).index('.' + panelSliderOptions.panelClass);
    var thisIndex = panel.index('.' + panelSliderOptions.panelClass);
    return (currentIndex == thisIndex);
  }
  
  function addButtons(panel)
  {
    var contentTrack = $('#' + panelSliderOptions.sliderId);
    
    panel.wrapAll('<div id="' + panelSliderOptions.buttonWrapperID + '"></div>');
    var buttonWrapper = $('#' + panelSliderOptions.buttonWrapperID);
    
    var buttonStyle = "position: absolute; top: 0; right: -";
    
    if (showNextButtonOnPanel(panel))
    {
      buttonWrapper.append('<div class="' + panelSliderOptions.nextButton + '"></div>');
      var nextButton = $('.' + panelSliderOptions.nextButton);
      nextButton.css({'display': 'none', 'position': 'absolute'});
      var topOffset = (getContentHeight(panel) - nextButton.height())/2;
      if (panelSliderOptions.maxButtonHeight)
        topOffset = topOffset > panelSliderOptions.maxButtonHeight ? panelSliderOptions.maxButtonHeight : topOffset;
      nextButton.css('top', topOffset);
      nextButton.click(function(){
        contentTrack.slideTo('next');
        return false;
      });
    }
    if (showPrevButtonOnPanel(panel))
    {
      buttonWrapper.prepend('<div class="' + panelSliderOptions.prevButton + '"></div>');
      var prevButton = $('.' + panelSliderOptions.prevButton);
      prevButton.css({'display': 'none', 'position': 'absolute'});
      var topOffset = (panel.outerHeight() - prevButton.height())/2;
      if (panelSliderOptions.maxButtonHeight)
        topOffset = topOffset > panelSliderOptions.maxButtonHeight ? panelSliderOptions.maxButtonHeight : topOffset;
      prevButton.css('top', topOffset);
      prevButton.click(function(){
        contentTrack.slideTo('previous');
        return false;
      });
    }
    buttonWrapper.replaceWith(buttonWrapper.contents());
    updateButtonPositions(panel);
  }
  
  function updateButtonPositions(panel)
  {
    var contentTrack = $('#' + panelSliderOptions.sliderId);
    var button;
    
    if (showNextButtonOnPanel(panel))
    {
      button = $('.' + panelSliderOptions.nextButton);
      updateButtonPosition(panel, button, 'right');
    }
    if (showPrevButtonOnPanel(panel))
    {
      button = $('.' + panelSliderOptions.prevButton);
      updateButtonPosition(panel, button, 'left');
    }
  }
  
  function updateButtonPosition(panel, button, location)
  {
    var display = button.css('display');
    button.css('display', 'block');
    var offset = Number(panel.css('margin-left').replace(/px/, '')) - button.outerWidth(true) + 'px';
    
    if (location == 'left') button.css({'left': offset, 'display': display});
    else button.css({'right': offset, 'display': display});
  }
  
  function showButtonsOnPanel(panel)
  {
    if (showPrevButtonOnPanel(panel) || showNextButtonOnPanel(panel))
      return true;
    return false;
  }
  
  function showNextButtonOnPanel(panel)
  {
    var contentTrack = $('#' + panelSliderOptions.sliderId);
    if (panelSliderOptions.displayButtons == 'next' || panelSliderOptions.displayButtons == 'both')
      if (!(panel[0] == contentTrack.find('.' + panelSliderOptions.panelClass + ':last')[0] && !panelSliderOptions.wrapAround))
        return true;
    return false;
  }
  
  function showPrevButtonOnPanel(panel)
  {
    var contentTrack = $('#' + panelSliderOptions.sliderId);
    if (panelSliderOptions.displayButtons == 'previous' || panelSliderOptions.displayButtons == 'both')
      if (!(panel[0] == contentTrack.find('.' + panelSliderOptions.panelClass + ':first')[0] && !panelSliderOptions.wrapAround))
        return true;
    return false;
  }

}(jQuery));