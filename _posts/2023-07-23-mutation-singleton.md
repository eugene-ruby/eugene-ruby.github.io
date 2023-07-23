---
layout: post
title:  "Меням класс через singleton"
date:   2023-07-23 14:52:48 +0300
categories: singleton
---

# Цель

Изменить поведение существующего кода, но изменения ограничить локальной видимостью

# Пример

Есть класс
[Typhoeus::Request](https://www.rubydoc.info/github/typhoeus/typhoeus/Typhoeus/Request)
и существующий метод [cache_key](https://www.rubydoc.info/github/typhoeus/typhoeus/Typhoeus/Request#cache_key-instance_method)
поведение которого мы хотим изменить.

В итоге через `define_singleton_method` реализован новый метод `cache_key` и `special_options`

## Детали реализации

{% highlight ruby %}

class MyCache < Typhoeus::Cache::Rails
    CACHE_NAMESPACE = 'BlaBla:'
    attr_accessor :request, :response, :mutated_request

    def get(request)
      @request = request
      mutation_request!
      
      super(mutated_request)
    end

    def set(request, response)
      @request = request
      @response = response
      mutation_request!

      super(mutated_request, response)
    end

    private

    def mutation_request!
      @mutated_request = mutation_request
    end
    
    def mutation_request
        request.define_singleton_method(:special_options) do
            options.slice(:method)
        end
        
        request.define_singleton_method(:cache_key) do
            str = "#{self.class.name}#{base_url}#{hashable_string_for(special_options)}"
            "#{CACHE_NAMESPACE}#{Digest::SHA1.hexdigest(str)}"
        end

        request
    end
end
{% endhighlight %}
