<script setup lang="ts">
import { watchEffect } from 'vue'
import { useTres } from '@tresjs/core'
import { PerspectiveCamera } from 'three'

import { CAMERA, cameraPosition } from '@/lib/scene/constants'

const { camera, sizes } = useTres()

watchEffect(() => {
  const activeCamera = camera.value
  if (!(activeCamera instanceof PerspectiveCamera)) {
    return
  }

  activeCamera.aspect = sizes.aspectRatio.value
  activeCamera.fov = CAMERA.fov
  activeCamera.near = CAMERA.near
  activeCamera.far = CAMERA.far
  activeCamera.updateProjectionMatrix()
})
</script>

<template>
  <TresPerspectiveCamera
    :make-default="true"
    :position="cameraPosition()"
    :fov="CAMERA.fov"
    :near="CAMERA.near"
    :far="CAMERA.far"
    :look-at="CAMERA.target"
  />
</template>
